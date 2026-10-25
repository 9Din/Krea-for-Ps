/* ============================================================================
 * store.js — 本地持久化 + Krea Token 密文存储
 *
 * 存储位置：UXP 插件数据目录（localFileSystem.getDataFolder()）
 *   config.json        非敏感偏好（语言、默认模型、置顶 App 等）
 *   token.json         API Token 明文兜底（与 nano.bannana.medicraft 2.0 相同的做法）
 *   credentials.json   API Token 本地加密/混淆备份（钥匙串可用时同时写入）
 *   apps-cache.json    Krea App 列表缓存
 *   history.json       提示词历史
 *   library.json       提示词库
 *   krea-output.png    生成结果临时落盘（置入图层用）
 *
 * Token 保护等级（自动选择，无法更高才降级），可通过自检 / storage-status.json 查看：
 *   keychain    系统钥匙串/凭据管理器（UXP storage.secureStorage）—— 推荐
 *               同时始终写一份本地备份，避免 PS 重启后钥匙串读不到而重新登录。
 *               备份优先 AES-256-GCM；UXP 没有 WebCrypto 时退化为本机混淆。
 *   aes         本机 AES-256-GCM（密钥存 config.json，localStorage 仅缓存）
 *   obfuscated  仅异或混淆（无 WebCrypto 时的降级，非真正加密）
 *   plain       明文 token.json（最终兜底，保证 PS 重启后一定读得到）
 *
 * 为什么还要 token.json：
 *   部分 Windows / macOS 环境的 secureStorage 在 PS 重启后会清空，WebCrypto
 *   和 localStorage 也可能不可用；此时再“加密”也只会把 Token 锁死。nano 版
 *   直接把 API Key 写进 UXP 数据目录的 config.json，所以从不要求重复登录。
 *   这里采用同样的明文 JSON 兜底，但单独放在 token.json，避免 resetPrefs()
 *   覆盖偏好时把 Token 一起清掉，并且每次写入都会读回校验。
 *
 * 安全边界：token.json 只有当前系统用户能读（UXP 数据目录权限），不是加密存储；
 * 不要把它同步到共享盘，也不要把整个插件数据目录打包发给别人。
 * ========================================================================== */
window.KREA_STORE = (function () {
  "use strict";

  var UXP = require("uxp");
  var fs = UXP.storage.localFileSystem;

  var CRED_FILE = "credentials.json";
  var CONFIG_FILE = "config.json";
  /* 明文兜底文件。字段名沿用 nano 版的 apiKey，方便排查/兼容。 */
  var TOKEN_FILE = "token.json";
  var SECURE_ALIAS = "krea.ps.apiToken";
  var LS_SECRET = "krea.ps.localSecret";
  /* 混淆密钥的持久化副本：部分 UXP 版本重启后会清 localStorage。
   * 它不是强加密密钥，真正的安全边界仍是系统钥匙串；这里只保证 Token 能恢复。 */
  var CONFIG_SECRET = "localSecret";
  /* 记录上次钥匙串读取是否可靠：失败过就优先读本地备份，避免每次启动再等超时。 */
  var LS_SECURE_STATE = "krea.ps.secureRead";

  var cachedToken = null;
  var cachedMode = null;
  /* 登出 / 保存新 Token 时自增，用来中止启动时发起的后台备份写，避免旧 Token 覆盖新文件。 */
  var tokenEpoch = 0;
  /* credentials.json 的写 / 删统一串行，避免后台备份与登出同时操作同一个文件。 */
  var credChain = Promise.resolve();
  var lastKeychain = "unknown";   // ok | empty | absent | timeout | error | skipped
  var lastKeychainMs = 0;
  var lastBackup = "unknown";     // aes | obfuscated | plain | missing | error
  var lastSecret = false;
  var lastPlainFile = "unknown";  // ok | missing | error

  /* ------------------------------------------------------------ 基础文件 IO */
  async function readJson(name, fallback) {
    try {
      var dir = await fs.getDataFolder();
      var entry = await dir.getEntry(name);
      var text = await entry.read();
      return JSON.parse(text);
    } catch (e) {
      return typeof fallback === "undefined" ? null : fallback;
    }
  }

  async function writeJson(name, obj) {
    var dir = await fs.getDataFolder();
    var file = await dir.createEntry(name, { overwrite: true });
    await file.write(JSON.stringify(obj));
    return true;
  }

  async function removeFile(name) {
    try {
      var dir = await fs.getDataFolder();
      var entry = await dir.getEntry(name);
      if (entry) await entry.delete();
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ------------------------------------------------------ 明文 Token 兜底 */
  /*
   * 这是从 nano.bannana.medicraft 2.0 借鉴的关键点：
   *   打开面板 -> 读数据目录里的 config.json -> 有 apiKey 就直接进入主界面；
   *   保存时 -> createEntry(..., {overwrite:true}).write(JSON.stringify({apiKey}))。
   *
   * 它不依赖 localStorage、WebCrypto 或系统钥匙串，所以 PS 重启后不会要求重输。
   * 我们保留钥匙串/加密备份作为“更安全的副本”，但 token.json 是最终保障：
   * 读取时先读它，写入时也必须写成功并读回校验。
   */
  function tokenFromPlain(obj) {
    if (!obj) return null;
    var v = obj.apiKey;
    if (typeof v !== "string" || !v) v = obj.token;
    return (typeof v === "string" && v) ? v : null;
  }

  async function readPlainToken() {
    var obj = await readJson(TOKEN_FILE, null);
    var token = tokenFromPlain(obj);
    if (!token) { lastPlainFile = "missing"; return null; }
    lastPlainFile = "ok";
    return token;
  }

  async function writePlainToken(token, expectedEpoch) {
    if (typeof expectedEpoch === "number" && expectedEpoch !== tokenEpoch) return null;
    try {
      await writeJson(TOKEN_FILE, { v: 1, apiKey: token });
      // 不能只信 write() resolve：杀毒软件/同步盘可能让文件实际没落盘。
      var back = await readJson(TOKEN_FILE, null);
      if (!back || back.apiKey !== token) throw new Error("plain-token-mismatch");
      if (typeof expectedEpoch === "number" && expectedEpoch !== tokenEpoch) return null;
      lastPlainFile = "ok";
      return true;
    } catch (e) {
      lastPlainFile = "error";
      throw e;
    }
  }

  async function removePlainToken() {
    await removeFile(TOKEN_FILE);
    var back = await readJson(TOKEN_FILE, null);
    if (back && tokenFromPlain(back)) {
      lastPlainFile = "error";
      throw new Error("plain-token-clear-failed");
    }
    lastPlainFile = "missing";
    return true;
  }

  /** 把 credentials.json 的写 / 删排进同一条链，保证登出后不会被后台备份写回来。 */
  function enqueueCred(task) {
    var run = credChain.then(task, task);
    credChain = run.then(function () { }, function () { });
    return run;
  }
  function writeCredBlob(blob) {
    return enqueueCred(function () { return writeJson(CRED_FILE, blob); });
  }
  function removeCredFile() {
    return enqueueCred(function () { return removeFile(CRED_FILE); });
  }

  /* --------------------------------------------------------------- base64 */
  function bytesToB64(bytes) {
    var s = "";
    for (var i = 0; i < bytes.length; i += 8192) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 8192, bytes.length)));
    }
    return btoa(s);
  }

  function b64ToBytes(str) {
    var bin = atob(str);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function randomBytes(n) {
    var out = new Uint8Array(n);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(out);
    } else {
      for (var i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
    }
    return out;
  }

  /* --------------------------------------------------------------- 本地密钥 */
  function lsGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function lsSet(key, value) {
    try {
      localStorage.setItem(key, value);
      // 写后回读，确认 localStorage 真的可持久化；否则 AES 用了无法恢复的临时密钥。
      return localStorage.getItem(key) === value;
    } catch (e) {
      return false;
    }
  }
  function lsRemove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }
  /** 把混淆密钥写进 config.json（与 setPrefs 共用串行队列，避免互相覆盖）。 */
  function persistConfigSecret(secret) {
    var apply = async function () {
      var cfg = await readJson(CONFIG_FILE, {}) || {};
      cfg[CONFIG_SECRET] = secret;
      await writeJson(CONFIG_FILE, cfg);
      return true;
    };
    var task = prefsWriteChain.then(apply, apply);
    prefsWriteChain = task.then(function () { }, function () { });
    return task.then(function () { return true; }, function () { return false; });
  }

  function removeConfigSecret() {
    var apply = async function () {
      var cfg = await readJson(CONFIG_FILE, null);
      if (cfg && Object.prototype.hasOwnProperty.call(cfg, CONFIG_SECRET)) {
        delete cfg[CONFIG_SECRET];
        await writeJson(CONFIG_FILE, cfg);
      }
      return true;
    };
    var task = prefsWriteChain.then(apply, apply);
    prefsWriteChain = task.then(function () { }, function () { });
    return task.then(function () { return true; }, function () { return false; });
  }

  /**
   * 读取 / 创建本地密钥。config.json 是跨重启的权威副本，localStorage 只做缓存；
   * 新建时 config 写不进去就返回 null，让调用方降级为明文，而不是造一个
   * 重启后无法恢复的临时密钥。
   */
  async function localSecret(create) {
    // config.json 是跨重启的权威副本；localStorage 只当缓存，因为部分 UXP 版本
    // 退出后会清空它。先读 config，避免 localStorage 里残留的旧密钥解不开新密文。
    var cfg = await readJson(CONFIG_FILE, null);
    var fromCfg = cfg && cfg[CONFIG_SECRET] ? String(cfg[CONFIG_SECRET]) : "";
    if (fromCfg) {
      if (lsGet(LS_SECRET) !== fromCfg) lsSet(LS_SECRET, fromCfg);
      lastSecret = true;
      return fromCfg;
    }

    // 兼容旧版本只把密钥写进 localStorage 的备份；此时仍可尝试解密旧文件。
    var legacy = lsGet(LS_SECRET);
    if (!create) {
      lastSecret = !!legacy;
      return legacy || null;
    }

    // 新建密钥必须写进 config.json 才算可跨重启恢复。写不进去时返回 null，
    // 让调用方降级为明文备份，而不是用一个重启后就丢失的临时密钥。
    var next = bytesToB64(randomBytes(32));
    var persisted = await persistConfigSecret(next);
    if (!persisted) {
      lastSecret = false;
      return null;
    }
    lsSet(LS_SECRET, next);
    lastSecret = true;
    return next;
  }

  /* ------------------------------------------------------- 弱降级：异或混淆 */
  function xorCrypt(text, secretB64) {
    var key = b64ToBytes(secretB64);
    var data = new Uint8Array(text.length);
    for (var i = 0; i < text.length; i++) data[i] = text.charCodeAt(i) & 0xff;
    var out = new Uint8Array(data.length);
    for (var j = 0; j < data.length; j++) out[j] = data[j] ^ key[j % key.length];
    return bytesToB64(out);
  }
  function xorDecrypt(b64, secretB64) {
    // xorCrypt 返回的是 base64；这里必须再解码一次，否则拿到的是密文的 base64 而不是 Token。
    var plainB64 = xorCrypt(String.fromCharCode.apply(null, b64ToBytes(b64)), secretB64);
    return utf8Decode(b64ToBytes(plainB64));
  }

  /* ------------------------------------------------------------ UTF-8 编解码 */
  function utf8Encode(str) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(str);
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
    return new Uint8Array(out);
  }

  function utf8Decode(bytes) {
    if (typeof TextDecoder !== "undefined") {
      try { return new TextDecoder().decode(bytes); } catch (e) { /* fall through */ }
    }
    var s = "";
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }

  /* ------------------------------------------------------------ AES-256-GCM */
  function hasWebCrypto() {
    return typeof crypto !== "undefined" && !!crypto.subtle && !!crypto.getRandomValues;
  }

  async function aesKey(create) {
    var raw = await localSecret(create);
    if (!raw) return null;
    return await crypto.subtle.importKey("raw", b64ToBytes(raw), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  }

  async function aesEncrypt(plain) {
    var key = await aesKey(true);
    if (!key) throw new Error("no-key");
    var iv = randomBytes(12);
    var ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, utf8Encode(plain));
    return { v: 2, alg: "AES-256-GCM", iv: bytesToB64(iv), ct: bytesToB64(new Uint8Array(ct)) };
  }

  async function aesDecrypt(blob) {
    var key = await aesKey(false);
    if (!key) throw new Error("no-key");
    var pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64ToBytes(blob.iv) }, key, b64ToBytes(blob.ct)
    );
    return utf8Decode(new Uint8Array(pt));
  }

  /* --------------------------------------------------------------- 钥匙串 */
  function secureStore() {
    try {
      return UXP.storage.secureStorage || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * 给钥匙串操作加超时。
   * Windows 凭据管理器 / macOS 钥匙串在个别 PS 版本里可能长时间不返回，
   * 这会让启动流程一直卡在“读取 Token”，最后只能要求用户重新输入。
   * 超时后继续读 AES 密文备份，保证“记住 Token”仍然生效。
   */
  function withStoreTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        reject(new Error("secure-storage-timeout"));
      }, ms || 2500);
      Promise.resolve(promise).then(function (value) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(value);
      }, function (err) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  /* ------------------------------------------------------------ Token 读写 */

  /**
   * 写本地 Token 备份。钥匙串可用时也要写：部分 Windows / macOS 环境里
   * secureStorage 在 Photoshop 重启后可能读不到，本地备份是唯一的恢复路径。
   * 备份等级：AES（有 WebCrypto）→ 混淆（localStorage 可用）→ 明文（最后手段）。
   * 返回实际写入的模式；写盘失败返回 null。
   */
  async function writeLocalBackup(token, expectedEpoch) {
    // 登出 / 换 Token 后，启动时的后台备份必须立刻作废。
    if (typeof expectedEpoch === "number" && expectedEpoch !== tokenEpoch) return null;
    var blob = null;
    var mode = null;
    if (hasWebCrypto()) {
      try {
        blob = await aesEncrypt(token);
        mode = "aes";
      } catch (e) { blob = null; }
    }
    if (!blob) {
      var secret = await localSecret(true);
      if (secret) {
        blob = { v: 1, note: "obfuscated", ct: xorCrypt(token, secret) };
        mode = "obfuscated";
      }
    }
    if (!blob) {
      blob = { v: 0, plain: token };
      mode = "plain";
    }
    if (typeof expectedEpoch === "number" && expectedEpoch !== tokenEpoch) return null;
    try {
      await writeCredBlob(blob);
      if (typeof expectedEpoch === "number" && expectedEpoch !== tokenEpoch) return null;
      lastBackup = mode;
      return mode;
    } catch (e) {
      lastBackup = "error";
      return null;
    }
  }

  /**
   * 写完立刻从文件读回校验。仅凭 write() resolve 不能保证重启后还能解密：
   * 例如密钥没真正落到 config.json 时，credentials.json 会变成无法恢复的密文。
   */
  async function verifyLocalBackup(token) {
    var back = await readLocalBackup();
    if (back !== token) {
      lastBackup = "error";
      throw new Error("credential-backup-mismatch");
    }
    return true;
  }

  /** 钥匙串不可用时的文件存储。 */
  async function writeFileToken(token) {
    var mode = await writeLocalBackup(token);
    if (!mode) throw new Error("credential-write-failed");
    await verifyLocalBackup(token);
    cachedMode = mode;
    return mode;
  }

  /**
   * 读本地备份。返回 token；文件不存在时 lastBackup=missing，
   * 解密失败时 lastBackup=error（随后仍会尝试钥匙串）。
   */
  async function readLocalBackup() {
    var blob = await readJson(CRED_FILE, null);
    if (!blob) { lastBackup = "missing"; return null; }
    try {
      if (blob.ct) {
        if (blob.v === 2) {
          if (!hasWebCrypto()) throw new Error("no-webcrypto");
          lastBackup = "aes";
          return await aesDecrypt(blob);
        }
        if (blob.v === 1) {
          var secret = await localSecret(false);
          if (!secret) throw new Error("no-local-secret");
          lastBackup = "obfuscated";
          return xorDecrypt(blob.ct, secret);
        }
      } else if (blob.plain) {
        lastBackup = "plain";
        return blob.plain;
      }
      throw new Error("unknown-format");
    } catch (e) {
      lastBackup = "error";
      return null;
    }
  }

  /**
   * 读系统钥匙串。为空或失败时记住“不可靠”，下次启动优先读本地备份，
   * 避免每次都卡在 secureStorage 超时上。
   */
  async function readKeychain() {
    var ss = secureStore();
    if (!ss || !ss.getItem) { lastKeychain = "absent"; return null; }
    var started = Date.now();
    try {
      var v = await withStoreTimeout(ss.getItem(SECURE_ALIAS), 3000);
      lastKeychainMs = Date.now() - started;
      if (v) {
        lastKeychain = "ok";
        lsSet(LS_SECURE_STATE, "ok");
        return v;
      }
      lastKeychain = "empty";
      lsSet(LS_SECURE_STATE, "failed:empty");
      return null;
    } catch (e) {
      lastKeychainMs = Date.now() - started;
      lastKeychain = (e && e.message === "secure-storage-timeout") ? "timeout" : "error";
      lsSet(LS_SECURE_STATE, "failed:" + lastKeychain);
      return null;
    }
  }

  async function readToken() {
    var secureState = lsGet(LS_SECURE_STATE) || "";
    var preferBackup = secureState.indexOf("failed") === 0;

    var healEpoch = tokenEpoch;

    // 0) 明文兜底优先：这是 nano 版“不需要重复登录”的核心。
    //    它不依赖钥匙串 / WebCrypto / localStorage，读取也最快。
    var plain = await readPlainToken();
    if (plain) {
      cachedMode = "plain";
      lastBackup = "plain";
      lastKeychain = "skipped";
      // 老用户升级后只有 token.json 时，后台补一份加密/混淆备份（不阻塞启动）。
      readJson(CRED_FILE, null).then(function (blob) {
        if (blob) return null;
        return writeLocalBackup(plain, healEpoch);
      }).catch(function (e) {
        console.warn("[Krea for Ps] 补写加密 Token 备份失败", e);
      });
      return plain;
    }

    // 1) 钥匙串上次读取失败过：先读本地备份，启动更快。
    if (preferBackup) {
      var early = await readLocalBackup();
      if (early) {
        cachedMode = lastBackup;
        lastKeychain = "skipped";
        await writePlainToken(early, healEpoch).catch(function (e) {
          console.warn("[Krea for Ps] 补写 token.json 失败", e);
        });
        return early;
      }
    }

    // 2) 系统钥匙串（首次启动或上次读取正常）
    var v = await readKeychain();
    if (v) {
      cachedMode = "keychain";
      // 钥匙串里的老 Token 也补一份明文兜底，保证下次钥匙串失效时仍可恢复。
      await writePlainToken(v, healEpoch).catch(function (e) {
        console.warn("[Krea for Ps] 补写 token.json 失败", e);
      });
      // 迁移 / 自愈：给老用户补一份本地备份；写失败时保留旧文件，不覆盖。
      // 这里不能 await：首次升级可能同时写 config.json 和 credentials.json，
      // 在慢盘 / 杀毒软件扫描时会拖过启动的 8s 超时，误报“本地存储不可用”。
      var heal = writeLocalBackup(v, healEpoch).then(function (mode) {
        if (mode) lastBackup = mode;
      }, function (e) {
        console.warn("[Krea for Ps] 补写 Token 本地备份失败", e);
      });
      // 最多等 1.2s 让诊断状态反映真实备份结果；慢盘上的剩余写入继续在后台完成。
      await withStoreTimeout(heal, 1200).catch(function () { /* background continues */ });
      return v;
    }

    // 3) 钥匙串读不到：本地备份
    if (!preferBackup) {
      var local = await readLocalBackup();
      if (local) {
        cachedMode = lastBackup;
        await writePlainToken(local, healEpoch).catch(function (e) {
          console.warn("[Krea for Ps] 补写 token.json 失败", e);
        });
        return local;
      }
    }

    // 4) 旧版明文 config.json 迁移
    var cfg = await readJson(CONFIG_FILE, null);
    if (cfg && cfg.apiKey) {
      var legacy = cfg.apiKey;
      delete cfg.apiKey;
      await writeJson(CONFIG_FILE, cfg);
      await writeToken(legacy);
      return legacy;
    }
    return null;
  }

  async function writeToken(token) {
    /*
     * 0) 先写明文兜底并读回校验。这一步成功，重启后就一定能恢复；
     *    钥匙串 / AES / 混淆都只是“更安全的副本”，失败不应再让用户重输。
     */
    await writePlainToken(token);
    cachedMode = "plain";
    lastBackup = "plain";

    // 1) 钥匙串（尽力而为）
    var ss = secureStore();
    if (ss && ss.setItem) {
      var keychainOk = false;
      try {
        await withStoreTimeout(ss.setItem(SECURE_ALIAS, token), 2500);
        keychainOk = true;
        cachedMode = "keychain";
      } catch (e) {
        // 钥匙串写失败：尽量把旧值清掉，避免读取时拿到过期 Token。
        try { if (ss.removeItem) await withStoreTimeout(ss.removeItem(SECURE_ALIAS), 1000); } catch (e2) { /* ignore */ }
      }
      if (keychainOk) {
        var backup = await writeLocalBackup(token);
        if (!backup) {
          // 钥匙串已写入新 Token，明文兜底也成功；加密备份失败只影响诊断。
          await removeCredFile();
          cachedMode = "plain";
          lastBackup = "plain";
          console.warn("[Krea for Ps] 加密 Token 备份写入失败，已使用 token.json 兜底");
          return cachedMode;
        }
        try {
          // 读回校验：确认密钥和密文都能跨重启恢复。
          await verifyLocalBackup(token);
          return cachedMode;
        } catch (e3) {
          await removeCredFile();
          cachedMode = "plain";
          lastBackup = "plain";
          console.warn("[Krea for Ps] 加密 Token 备份校验失败，已使用 token.json 兜底", e3);
          return cachedMode;
        }
      }
    }

    // 2) 文件加密备份（AES / 混淆 / 明文）。失败也不影响 token.json 的恢复能力。
    try {
      return await writeFileToken(token);
    } catch (e4) {
      await removeCredFile();
      cachedMode = "plain";
      lastBackup = "plain";
      console.warn("[Krea for Ps] Token 加密备份失败，已使用 token.json 兜底", e4);
      return cachedMode;
    }
  }

  async function clearToken() {
    // 先作废启动时可能还在进行中的后台备份，再删除文件。
    tokenEpoch++;
    // 明文兜底先删；即使删除失败，也要继续清钥匙串和加密备份，最后再报错。
    var plainError = null;
    try { await removePlainToken(); } catch (e) { plainError = e; }
    var ss = secureStore();
    if (ss && ss.removeItem) {
      try { await withStoreTimeout(ss.removeItem(SECURE_ALIAS), 1000); } catch (e) { /* ignore */ }
    }
    await removeCredFile();
    var cfg = await readJson(CONFIG_FILE, null);
    if (cfg && cfg.apiKey) { delete cfg.apiKey; await writeJson(CONFIG_FILE, cfg); }
    // 清掉本地密钥 / 钥匙串状态：即使 credentials.json 删除失败，旧备份也无法再解出 Token。
    lsRemove(LS_SECRET);
    lsRemove(LS_SECURE_STATE);
    await removeConfigSecret();
    lastSecret = false;
    cachedToken = null;
    cachedMode = null;
    lastKeychain = "unknown";
    lastKeychainMs = 0;
    lastBackup = "missing";
    if (plainError) throw plainError;
    return true;
  }

  /* 会话内缓存，避免每次请求都读盘 */
  async function getToken() {
    if (cachedToken) return cachedToken;
    var epoch = tokenEpoch;
    var token = await readToken();
    // 读取期间用户登出 / 换 Token：不要把旧读取结果写回会话缓存。
    if (epoch !== tokenEpoch) return cachedToken || null;
    cachedToken = token;
    return cachedToken;
  }

  async function setToken(token) {
    if (!token) { await clearToken(); return "none"; }
    // 作废旧 Token 可能还在进行中的后台备份 / 自愈写入。
    tokenEpoch++;
    // 写盘成功后再更新会话缓存：写失败时不能让 getToken() 返回一个并未保存的值。
    var mode = await writeToken(token);
    cachedToken = token;
    return mode;
  }

  /**
   * Token 存储诊断（不含 Token 本身），用于设置页 / 自检 / 支持排查。
   * keychain: ok | empty | absent | timeout | error | skipped
   * backup:   aes | obfuscated | plain | missing | error
   */
  function storageInfo() {
    return {
      mode: cachedMode || "none",
      keychain: lastKeychain,
      keychainMs: lastKeychainMs,
      keychainState: lsGet(LS_SECURE_STATE) || "unknown",
      backup: lastBackup,
      plainFile: lastPlainFile,
      webCrypto: hasWebCrypto(),
      secureStorage: !!secureStore(),
      localSecret: lastSecret
    };
  }

  /* ------------------------------------------------------------------ 偏好 */
  var DEFAULT_PREFS = {
    lang: null,
    model: null,
    tab: "apps",
    pinned: [],
    favorites: [],
    outputMode: "newLayer",
    sampling: "visible",
    feather: 0,
    appFilter: "all"
  };

  /* 偏好写入队列：setPrefs / resetPrefs / getPrefs 共用，避免读改写互相覆盖。 */
  var prefsWriteChain = Promise.resolve();

  async function getPrefs() {
    // 等排队中的偏好写入落盘，避免启动/设置页读到旧值。
    await prefsWriteChain;
    var cfg = await readJson(CONFIG_FILE, {});
    var out = {};
    for (var k in DEFAULT_PREFS) {
      out[k] = (cfg && Object.prototype.hasOwnProperty.call(cfg, k)) ? cfg[k] : DEFAULT_PREFS[k];
    }
    return out;
  }

  /*
   * 多个 UI 事件会同时 fire-and-forget 地调用 setPrefs（切换 tab、语言、采样等）。
   * 如果各自“读-改-写”同一个 config.json，后完成的写入会覆盖前一次修改。
   * 这里串行执行整段读改写，保证最后一次调用包含之前所有 patch。
   */
  function setPrefs(patch) {
    var apply = async function () {
      var cfg = await readJson(CONFIG_FILE, {}) || {};
      for (var k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) cfg[k] = patch[k];
      await writeJson(CONFIG_FILE, cfg);
      return cfg;
    };
    var task = prefsWriteChain.then(apply, apply);
    // 偏好是 best-effort：写失败不应触发全局 unhandledrejection / 致命横幅。
    var safe = task.catch(function (e) {
      console.warn("[Krea for Ps] 保存偏好失败", e);
      return {};
    });
    prefsWriteChain = safe.then(function () { }, function () { });
    return safe;
  }

  /** 与 setPrefs 共用队列，避免“重置”之后又被之前排队的偏好写回来。 */
  function resetPrefs() {
    var apply = async function () {
      await writeJson(CONFIG_FILE, {});
      return {};
    };
    var task = prefsWriteChain.then(apply, apply);
    prefsWriteChain = task.then(function () { }, function () { });
    return task;
  }

  return {
    readJson: readJson,
    writeJson: writeJson,
    removeFile: removeFile,
    getToken: getToken,
    setToken: setToken,
    clearToken: clearToken,
    storageInfo: storageInfo,
    getPrefs: getPrefs,
    setPrefs: setPrefs,
    resetPrefs: resetPrefs,
    DEFAULT_PREFS: DEFAULT_PREFS,
    b64ToBytes: b64ToBytes
  };
})();
