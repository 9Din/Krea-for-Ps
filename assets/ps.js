/* ============================================================================
 * ps.js — Photoshop 集成层
 *   - 选区读取（batchPlay get selection）
 *   - 选区像素捕获：PS ≥ 24.4 用官方 imaging API；旧版走剪贴板兼容方案
 *   - 结果置入：placeEvent + 缩放/位移对齐选区 + 栅格化
 *   - 羽化边缘（contract + feather 蒙版）
 *   - 文件选择与 base64 读取
 * ========================================================================== */
window.KREA_PS = (function () {
  "use strict";

  var UXP = require("uxp");
  var fs = UXP.storage.localFileSystem;
  var formats = UXP.storage.formats;
  var psApp = require("photoshop").app;
  var psCore = require("photoshop").core;
  var psAction = require("photoshop").action;

  var psImaging = null;
  var MAX_PX = 1024;          // 送入模型的图片最长边（对齐原版 oH() = 1024）
  var MAX_REF_BYTES = 8 * 1024 * 1024;
  // 官方插件（Krea_Photoshop_1.0.34/host.js）显式指定 sRGB，避免 CMYK /
  // 灰度文档返回的通道数与 RGB 假设不一致，最终把像素解释成黑图。
  var CAPTURE_PROFILE = "sRGB IEC61966-2.1";

  /**
   * 统一的 modal 包装。
   * Photoshop 22+ 的文档类 API（documents.add / paste / resizeImage / saveAs /
   * layer.scale / translate / rasterize / delete / 蒙版批处理）必须在
   * core.executeAsModal 的作用域里执行，否则轻则抛错、重则留下半成品状态。
   * 老版本若没有 core.executeAsModal，则退化为直接执行（保持原有行为）。
   */
  function withModal(fn, commandName) {
    if (psCore && typeof psCore.executeAsModal === "function") {
      return psCore.executeAsModal(fn, { commandName: commandName || "Krea for Ps" });
    }
    return Promise.resolve().then(fn);
  }

  function init() {
    try { psImaging = require("photoshop").imaging; } catch (e) { psImaging = null; }
    return !!psImaging;
  }

  function version() {
    try { return parseFloat(psApp.version) || 0; } catch (e) { return 0; }
  }

  function hasModernCapture() {
    if (!psImaging) init();
    return !!psImaging && typeof psImaging.getPixels === "function" && version() >= 24.4;
  }

  function activeDoc() {
    try { return psApp.activeDocument || null; } catch (e) { return null; }
  }

  function docInfo() {
    var doc = activeDoc();
    if (!doc) return null;
    return {
      id: doc.id,
      name: doc.name,
      width: doc.width,
      height: doc.height,
      resolution: doc.resolution,
      mode: doc.mode
    };
  }

  /* --------------------------------------------------------------- 缓冲区 */
  function bufferToBase64(buf) {
    var bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    var s = "";
    for (var i = 0; i < bytes.length; i += 8192) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 8192, bytes.length)));
    }
    return btoa(s);
  }

  function stripDataUrl(base64) {
    return String(base64).replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
  }

  /**
   * encodeImageData() 在没有明确格式参数时通常输出 JPEG；旧代码却统一按
   * image/png 拼 data URL，导致 UXP <img> 预览成黑图。这里根据文件头纠正 MIME。
   * fallback 省略时维持旧行为（未知一律 PNG）；上传文件需要区分 GIF/AVIF 时
   * 传空字符串，让调用方再按扩展名兜底。
   */
  function sniffMime(base64, fallback) {
    var b = stripDataUrl(base64 || "");
    if (/^iVBORw0KGgo/.test(b)) return "image/png";
    if (/^\/9j\//.test(b)) return "image/jpeg";
    if (/^UklGR/.test(b)) return "image/webp";
    if (/^R0lGOD/.test(b)) return "image/gif";
    return fallback === undefined ? "image/png" : fallback;
  }

  /** 上传文件按字节头判断格式；ISOBMFF 的 major brand 能区分 AVIF / HEIC。 */
  function mimeFromBytes(bytes) {
    var b = bytes || [];
    if (b.length > 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
    if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
    if (b.length > 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
    if (b.length > 12 && String.fromCharCode(b[0], b[1], b[2], b[3]) === "RIFF" &&
      String.fromCharCode(b[8], b[9], b[10], b[11]) === "WEBP") return "image/webp";
    if (b.length > 12 && String.fromCharCode(b[4], b[5], b[6], b[7]) === "ftyp") {
      var brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
      if (brand === "avif" || brand === "avis") return "image/avif";
      if (brand === "heic" || brand === "heix" || brand === "hevc" ||
          brand === "hevx" || brand === "mif1" || brand === "msf1") return "image/heic";
    }
    return "";
  }

  /* ------------------------------------------------------------ 选区读取 */
  async function getSelection(doc) {
    if (!doc) return null;
    try {
      var res = await psAction.batchPlay([
        { _obj: "get", _target: [{ _property: "selection" }, { _ref: "document", _id: doc.id }] }
      ], {});
      var s = res && res[0] && res[0].selection;
      if (s) {
        return { left: s.left._value, top: s.top._value, right: s.right._value, bottom: s.bottom._value };
      }
    } catch (e) { /* 无选区 */ }
    return null;
  }

  function selectionSize(sel) {
    return { width: Math.round(sel.right - sel.left), height: Math.round(sel.bottom - sel.top) };
  }

  /* -------------------------------------------------- 新版 imaging 捕获 */
  /**
   * 对齐参考插件的捕获顺序：先用当前「生成范围」读像素；如果勾了「仅当前图层」
   * 但当前图层是空图层/调整图层，getPixels 会得到空数据。此时自动退回
   * 「所有可见图层」再读一次，避免把一个明明有内容的选区误判成空选区。
   * 所有路径都失败时由调用方提示用户，不再发送黑色占位图。
   */
  function boundNumber(value) {
    if (value && typeof value === "object" && "_value" in value) return Number(value._value);
    return Number(value);
  }

  /**
   * getPixels 的 sourceBounds 对小数 / 越界值比较敏感；统一转成文档内的整数边界。
   * 只影响读像素，不影响后续结果置入使用的原始 selection。
   */
  function normalizeCaptureBounds(selection, doc) {
    try {
      // 生成轮询期间用户可能切到别的文档；必须按抓图时记录的 doc 收敛边界，
      // 否则会用当前活动文档的尺寸去裁剪原文档的选区。
      var target = doc || activeDoc();
      var maxW = target ? boundNumber(target.width) : Infinity;
      var maxH = target ? boundNumber(target.height) : Infinity;
      var l = boundNumber(selection.left);
      var t = boundNumber(selection.top);
      var r = boundNumber(selection.right);
      var b = boundNumber(selection.bottom);
      if (!isFinite(l) || !isFinite(t) || !isFinite(r) || !isFinite(b)) return selection;
      var left = Math.floor(l);
      var top = Math.floor(t);
      var right = Math.ceil(r);
      var bottom = Math.ceil(b);
      if (isFinite(maxW)) {
        left = Math.min(Math.max(0, left), Math.max(0, maxW - 1));
        right = Math.min(maxW, Math.max(left + 1, right));
      }
      if (isFinite(maxH)) {
        top = Math.min(Math.max(0, top), Math.max(0, maxH - 1));
        bottom = Math.min(maxH, Math.max(top + 1, bottom));
      }
      return { left: left, top: top, right: right, bottom: bottom };
    } catch (e) {
      return selection;
    }
  }

  /** 空像素图层 / 调整图层的 bounds 为 0，直接跳过 selected 捕获，避免白底占位。 */
  function layerHasPixels(layer) {
    if (!layer) return true;
    try {
      var b = layer.boundsNoEffects || layer.bounds;
      if (!b) return true;
      var l = boundNumber(b.left);
      var t = boundNumber(b.top);
      var r = boundNumber(b.right);
      var bo = boundNumber(b.bottom);
      if (!isFinite(l) || !isFinite(t) || !isFinite(r) || !isFinite(bo)) return true;
      return r > l && bo > t;
    } catch (e) {
      return true;
    }
  }

  function disposeCaptureAttempt(attempt) {
    try {
      var img = attempt && attempt.px && attempt.px.imageData;
      if (img && typeof img.dispose === "function") img.dispose();
    } catch (e) { /* ignore */ }
  }

  /**
   * 读取一次像素。按顺序降级，任何一步成功就返回：
   *   RGB+sRGB -> RGB（不带 profile）-> 不带 documentID（旧版兼容）
   * applyAlpha:true 时额外用于「白底 matte」复核，解决个别 PS 版本
   * applyAlpha:false 返回的 alpha 全 0、但 RGB 实际有内容的问题。
   * 所有失败都会记入 errors，最终由 capture() 带进诊断信息。
   */
  async function readCaptureAttempt(mode, applyAlpha, documentID, selection, targetSize, layerId) {
    var variants = applyAlpha
      ? [
        { label: "matte/srgb", colorProfile: CAPTURE_PROFILE },
        { label: "matte", colorProfile: null },
        { label: "matte/no-doc", colorProfile: null, noDocumentID: true }
      ]
      : [
        { label: "rgb/srgb", colorProfile: CAPTURE_PROFILE },
        { label: "rgb", colorProfile: null },
        { label: "rgb/no-doc", colorProfile: null, noDocumentID: true }
      ];
    var errors = [];
    for (var i = 0; i < variants.length; i++) {
      var v = variants[i];
      var px = null;
      var opts = {
        sourceBounds: selection,
        colorSpace: "RGB",
        componentSize: 8,
        applyAlpha: applyAlpha
      };
      if (!v.noDocumentID) opts.documentID = documentID;
      if (v.colorProfile) opts.colorProfile = v.colorProfile;
      if (targetSize) opts.targetSize = targetSize;
      if (layerId) opts.layerID = layerId;
      try {
        if (v.noDocumentID && psApp.activeDocument && psApp.activeDocument.id !== documentID) {
          throw new Error("active document changed");
        }
        px = await psImaging.getPixels(opts);
        var img = px && px.imageData;
        if (!img || !img.width || !img.height) throw new Error("no imageData");
        var cs = img.colorSpace ? String(img.colorSpace).trim().toUpperCase() : "";
        if (cs && cs !== "RGB") {
          throw new Error("unexpected colorSpace " + img.colorSpace);
        }
        if (img.componentSize && Number(img.componentSize) !== 8) {
          throw new Error("unexpected componentSize " + img.componentSize);
        }
        var comps = img.components || 0;
        if (comps !== 3 && comps !== 4 && comps !== 1 && comps !== 2) {
          throw new Error("unexpected components " + comps);
        }
        var data;
        try {
          data = await img.getData({ chunky: true });
        } catch (eChunky) {
          data = await img.getData();
        }
        var stats = analyzeCapture(px, data);
        console.log("[Krea] capture read mode=" + mode + " variant=" + v.label +
          " state=" + stats.state + " " + img.width + "x" + img.height +
          " comps=" + comps + " alphaZero=" + stats.alphaAllZero +
          " first=" + stats.first.join(","));
        return { px: px, data: data, stats: stats, label: v.label, matted: applyAlpha };
      } catch (e) {
        if (px && px.imageData && typeof px.imageData.dispose === "function") {
          try { px.imageData.dispose(); } catch (eDispose) { /* ignore */ }
        }
        var msg = (e && e.message) ? e.message : String(e);
        errors.push(mode + "/" + v.label + ": " + msg);
        console.warn("[Krea] capture read failed (" + mode + "/" + v.label + ")", e);
      }
    }
    return { errors: errors };
  }

  /** 编码并释放 attempt；失败返回 null。 */
  async function encodeCapture(attempt) {
    if (!attempt || !attempt.px) return null;
    var img = attempt.px.imageData;
    var out = null;
    try {
      if (attempt.stats.state === "transparent") return null;
      // applyAlpha:true 得到的全白图代表「没有可见像素」，不能当内容上传。
      if (attempt.matted && attempt.stats.allWhite) return null;
      out = await flattenCaptureAlpha(attempt.px, attempt.data, attempt.stats);
      if (!out) return null;
      // 与官方一致：不传 type，encodeImageData 默认输出 JPEG。
      // JPEG 没有 alpha 通道，从格式上杜绝“透明区域被显示成黑色”。
      var encoded = await psImaging.encodeImageData({ imageData: out, base64: true });
      if (!encoded) return null;
      return {
        base64: encoded,
        mime: sniffMime(encoded),
        solidBlack: attempt.stats.state === "black"
      };
    } catch (e) {
      console.warn("[Krea] capture encode failed (" + attempt.label + ")", e);
      return null;
    } finally {
      try {
        if (out && out !== img && typeof out.dispose === "function") out.dispose();
      } catch (eOut) { /* ignore */ }
      try {
        if (img && typeof img.dispose === "function") img.dispose();
      } catch (eImg) { /* ignore */ }
    }
  }


  async function captureModern(documentID, selection, sampling, capPx, doc) {
    if (!psImaging) init();
    if (!psImaging) return null;
    selection = normalizeCaptureBounds(selection, doc);
    var size = selectionSize(selection);
    var cap = capPx || MAX_PX;
    var targetSize = null;
    if (size.width > cap || size.height > cap) {
      var scale = Math.min(cap / size.width, cap / size.height);
      targetSize = {
        width: Math.max(1, Math.round(size.width * scale)),
        height: Math.max(1, Math.round(size.height * scale))
      };
    }

    var modes = sampling === "selected" ? ["selected", "visible"] : ["visible"];
    var blackCandidate = null;
    var attempts = [];
    var sawPixelData = false;
    var sawContent = false;
    var sawTransparent = false;
    var hadReadError = false;
    for (var m = 0; m < modes.length; m++) {
      // 对齐官方插件 host.js 的 capturePhotoshopPixels()：
      //   · 强制 RGB + sRGB，避免 CMYK/灰度文档被按错通道解释；
      //   · applyAlpha:false 保留未预乘的 RGB，透明像素不会先被乘成 0（黑）；
      //   · getData({chunky:true}) 明确交错通道顺序。
      var layer = null;
      var layerId = 0;
      if (modes[m] === "selected") {
        var active = doc || psApp.activeDocument;
        var layers = active && active.activeLayers;
        if (!layers || !layers.length) {
          attempts.push("selected: no active layer");
          continue;
        }
        layer = layers[0];
        layerId = layer.id;
        // 空图层在 applyAlpha:true 下会得到一张全白图；直接换 visible。
        if (!layerHasPixels(layer)) {
          attempts.push("selected: empty layer bounds");
          continue;
        }
      }

      var primary = await readCaptureAttempt(modes[m], false, documentID, selection, targetSize, layerId);

      if (!primary.px) {
        hadReadError = true;
        attempts = attempts.concat(primary.errors || []);
        // applyAlpha:false 全部失败时，再尝试白底 matte。
        var matteFail = await readCaptureAttempt(modes[m], true, documentID, selection, targetSize, layerId);
        if (!matteFail.px) {
          hadReadError = true;
          attempts = attempts.concat(matteFail.errors || []);
          continue;
        }
        sawPixelData = true;
        var encMatteFail = await encodeCapture(matteFail);
        if (!encMatteFail) {
          sawTransparent = true;
          attempts.push(modes[m] + ": matte blank");
          continue;
        }
        sawContent = true;
        if (encMatteFail.solidBlack && modes[m] === "selected") {
          if (!blackCandidate) blackCandidate = encMatteFail.base64;
          continue;
        }
        return encMatteFail;
      }
      sawPixelData = true;

      // 全透明：selected 直接换 visible；visible 再用白底 matte 确认，
      // 因为个别 PS 版本的 alpha 通道全 0，但 RGB 实际有内容。
      if (primary.stats.state === "transparent") {
        disposeCaptureAttempt(primary);
        sawTransparent = true;
        attempts.push(modes[m] + ": transparent");
        if (modes[m] === "visible") {
          var matte = await readCaptureAttempt("visible", true, documentID, selection, targetSize, 0);
          if (!matte.px) {
            hadReadError = true;
            attempts = attempts.concat(matte.errors || []);
            continue;
          }
          sawPixelData = true;
          var encMatte = await encodeCapture(matte);
          if (encMatte) {
            sawContent = true;
            return encMatte;
          }
          sawTransparent = true;
          attempts.push("visible: matte blank");
        }
        continue;
      }

      // alpha 全 0 但 RGB 有内容：alpha 可能不可靠，用白底 matte 复核；
      // matte 也失败时保留 RGB（flatten 会直接拷贝 RGB，不再乘 0）。
      if (primary.stats.alphaUnreliable) {
        var matte2 = await readCaptureAttempt(modes[m], true, documentID, selection, targetSize, layerId);
        if (matte2.px) {
          sawPixelData = true;
          if (matte2.stats.state === "transparent" || matte2.stats.allWhite) {
            disposeCaptureAttempt(primary);
            sawTransparent = true;
            attempts.push(modes[m] + ": alpha unreliable and matte blank");
            continue;
          }
          var encMatte2 = await encodeCapture(matte2);
          if (encMatte2) {
            disposeCaptureAttempt(primary);
            sawContent = true;
            if (encMatte2.solidBlack && modes[m] === "selected") {
              if (!blackCandidate) blackCandidate = encMatte2.base64;
              continue;
            }
            return encMatte2;
          }
        } else {
          hadReadError = true;
          attempts = attempts.concat(matte2.errors || []);
          // alpha 全 0 时 RGB 可能是透明像素残留的颜色；matte 也读不到时
          // 宁可换 visible / 复制文档兜底，也不要把残留 RGB 当内容上传。
          disposeCaptureAttempt(primary);
          attempts.push(modes[m] + ": alpha unreliable and matte unavailable");
          continue;
        }
      }

      var encPrimary = await encodeCapture(primary);
      if (!encPrimary) {
        attempts.push(modes[m] + ": encode failed");
        continue;
      }
      sawContent = true;
      if (encPrimary.solidBlack && modes[m] === "selected") {
        if (!blackCandidate) blackCandidate = encPrimary.base64;
        continue;
      }
      return encPrimary;
    }
    if (blackCandidate) {
      return {
        base64: blackCandidate, mime: sniffMime(blackCandidate),
        solidBlack: true, attempts: attempts
      };
    }
    // 只有「确实读到了像素、全部为空、且没有任何读取错误」才算空选区；
    // 这样空选区仍然提示用户，而有内容但 API 报错的选区会继续走复制文档兜底。
    return {
      base64: null, attempts: attempts,
      empty: sawPixelData && !sawContent && !blackCandidate && !hadReadError && sawTransparent
    };
  }

  function captureBytes(data) {
    if (!data) return null;
    if (data instanceof Uint8Array) return data;
    try { return new Uint8Array(data); } catch (e) { return null; }
  }

  /**
   * 分析一次成像结果。
   *   · 有 alpha 且所有 alpha 都为 0、RGB 也为 0 → transparent，换 visible；
   *   · 有 alpha 且所有 alpha 都为 0、但 RGB 有内容 → alphaUnreliable：
   *     个别 PS 版本 applyAlpha:false 会返回这种数据，需要白底 matte 复核，
   *     复核失败时至少直接拷贝 RGB，不能乘 0 变成黑图；
   *   · 不透明像素全黑 → black；纯白、任意彩色 → ok。
   */
  function analyzeCapture(px, data) {
    var out = {
      state: "ok", comps: 0, hasAlpha: false, alphaAllZero: false,
      alphaUnreliable: false, allWhite: false, first: []
    };
    try {
      var img = px && px.imageData;
      if (!img) return out;
      var comps = img.components || 0;
      var w = img.width || 0;
      var h = img.height || 0;
      out.comps = comps;
      if (!w || !h || comps < 1) return out;
      var bytes = captureBytes(data);
      if (!bytes || !bytes.length || bytes.length < w * h * comps) return out;
      out.first = Array.prototype.slice.call(bytes, 0, Math.min(comps, 4));

      var hasAlpha = comps === 2 || comps === 4;
      var colorComps = hasAlpha ? comps - 1 : comps;
      if (colorComps < 1) return out;
      out.hasAlpha = hasAlpha;

      var anyOpaque = !hasAlpha;
      var anyOpaqueColor = !hasAlpha;
      var anyColor = false;
      var allWhite = true;
      var count = w * h;
      for (var p = 0; p < count; p++) {
        var off = p * comps;
        var a = hasAlpha ? bytes[off + colorComps] : 255;
        if (a > 8) anyOpaque = true;
        for (var c = 0; c < colorComps; c++) {
          var v = bytes[off + c];
          if (v > 8) {
            anyColor = true;
            if (a > 8) anyOpaqueColor = true;
          }
          if (v < 250) allWhite = false;
        }
      }
      out.allWhite = allWhite;
      if (hasAlpha && !anyOpaque) {
        out.alphaAllZero = true;
        if (anyColor) {
          // alpha 不可信，但 RGB 里确实有内容。
          out.state = "ok";
          out.alphaUnreliable = true;
        } else {
          out.state = "transparent";
        }
      } else if (!anyOpaqueColor) {
        out.state = "black";
      } else {
        out.state = "ok";
      }
    } catch (e) {
      return { state: "ok", comps: 0, hasAlpha: false, alphaAllZero: false, alphaUnreliable: false, allWhite: false, first: [] };
    }
    return out;
  }

  /**
   * 将 RGBA / 灰度+alpha 合成到白底。
   * getPixels 使用 applyAlpha:false 时，RGB 是未预乘的原始颜色，按
   * out = rgb * a + 255 * (1 - a) 合成即可；这样半透明区域不会发黑。
   * 若 alpha 全 0 但 RGB 有内容（alpha 不可信），直接拷贝 RGB。
   */
  async function flattenCaptureAlpha(px, data, stats) {
    var img = px && px.imageData;
    if (!img) return null;
    var comps = img.components || 0;
    if (comps === 3) return img;
    if (comps !== 1 && comps !== 2 && comps !== 4) return null;
    if (typeof psImaging.createImageDataFromBuffer !== "function") return null;
    if (img.componentSize && img.componentSize !== 8) return null;

    var bytes = captureBytes(data);
    var w = img.width || 0;
    var h = img.height || 0;
    if (!bytes || !w || !h || bytes.length < w * h * comps) return null;

    var out = new Uint8Array(w * h * 3);
    var count = w * h;
    var unreliable = !!(stats && stats.alphaUnreliable);

    if (comps === 1) {
      for (var p1 = 0; p1 < count; p1++) {
        var g = bytes[p1];
        out[p1 * 3] = g;
        out[p1 * 3 + 1] = g;
        out[p1 * 3 + 2] = g;
      }
    } else if (comps === 2) {
      for (var p2 = 0; p2 < count; p2++) {
        var s2 = p2 * 2;
        var d2 = p2 * 3;
        var a2 = bytes[s2 + 1];
        if (unreliable) {
          out[d2] = bytes[s2];
          out[d2 + 1] = bytes[s2];
          out[d2 + 2] = bytes[s2];
        } else {
          var inv2 = 255 - a2;
          var gray = Math.round((bytes[s2] * a2 + 255 * inv2) / 255);
          out[d2] = gray;
          out[d2 + 1] = gray;
          out[d2 + 2] = gray;
        }
      }
    } else {
      for (var p4 = 0; p4 < count; p4++) {
        var s4 = p4 * 4;
        var d4 = p4 * 3;
        if (unreliable) {
          out[d4] = bytes[s4];
          out[d4 + 1] = bytes[s4 + 1];
          out[d4 + 2] = bytes[s4 + 2];
        } else {
          var a4 = bytes[s4 + 3];
          var inv4 = 255 - a4;
          out[d4] = Math.round((bytes[s4] * a4 + 255 * inv4) / 255);
          out[d4 + 1] = Math.round((bytes[s4 + 1] * a4 + 255 * inv4) / 255);
          out[d4 + 2] = Math.round((bytes[s4 + 2] * a4 + 255 * inv4) / 255);
        }
      }
    }

    try {
      return await psImaging.createImageDataFromBuffer(out, {
        width: w,
        height: h,
        components: 3,
        chunky: true,
        colorSpace: "RGB",
        colorProfile: CAPTURE_PROFILE
      });
    } catch (e) {
      // 个别 PS 版本不接受自定义 colorProfile，退化为不传 profile 的 RGB。
      try {
        return await psImaging.createImageDataFromBuffer(out, {
          width: w,
          height: h,
          components: 3,
          chunky: true,
          colorSpace: "RGB"
        });
      } catch (e2) {
        console.warn("[Krea] flatten capture alpha failed", e2);
        return null;
      }
    }
  }

  /* --------------------------------------------- 旧版剪贴板兼容捕获 */
  async function captureLegacy(selection, sampling, capPx) {
    var tag = "krea-clip-check-" + Date.now();
    var hasPixels = false;
    try {
      await navigator.clipboard.write({ "text/plain": tag });
    } catch (e) {
      console.warn("[Krea] legacy clipboard write failed", e);
      return null;
    }
    await new Promise(function (r) { setTimeout(r, 200); });
    try {
      var cmd = sampling === "selected" ? { _obj: "copyEvent", copyHint: "pixels" } : { _obj: "copyMerged" };
      await psAction.batchPlay([cmd], {});
      var readBack = await navigator.clipboard.read();
      hasPixels = readBack["text/plain"] !== tag;
    } catch (e) {
      console.warn("[Krea] legacy copy/read failed", e);
      hasPixels = false;
    }
    if (!hasPixels) {
      console.log("[Krea] legacy clipboard has no pixels (sampling=" + sampling + ")");
      return null;
    }

    var size = selectionSize(selection);
    var tmp = null;
    try {
      tmp = await (await fs.getTemporaryFolder()).createFile("krea-selection-tmp.png", { overwrite: true });
      var cap = capPx || MAX_PX;
      // 新建 / 粘贴 / 缩放 / 存盘 / 关闭文档都必须在 modal 作用域内完成
      return await withModal(async function () {
        var doc = await psApp.documents.add({ width: size.width, height: size.height, resolution: 72, mode: "RGBColorMode" });
        try {
          await doc.paste();
          if (size.width > cap || size.height > cap) {
            var scale = Math.min(cap / size.width, cap / size.height);
            await doc.resizeImage(Math.round(size.width * scale), Math.round(size.height * scale));
          }
          await doc.saveAs.png(tmp, { compression: 6 }, true);
          var bin = await tmp.read({ format: formats.binary });
          return bufferToBase64(bin);
        } finally {
          // 临时文档只用于截图：绝不能 close(true)，否则可能把缩放结果写回源文件。
          try { await doc.closeWithoutSaving(); }
          catch (e2) { try { await doc.close(false); } catch (e3) { } }
        }
      }, "Krea Capture Selection");
    } catch (e) {
      return null;
    } finally {
      try { if (tmp) await tmp.delete(); } catch (e3) { }
    }
  }
  /* --------------------------------------- 最终兜底：复制文档后裁剪另存 */
  /**
   * 完全不依赖 imaging / 剪贴板：复制当前文档 -> 拼合 -> 裁剪到选区 -> 缩放 -> 存 PNG。
   * 只在现代捕获和剪贴板捕获都失败时使用，避免把黑图 / 空白占位图送给模型。
   */
  async function captureByDuplicate(selection, capPx, documentID) {
    var src = activeDoc();
    if (!src || (documentID && src.id !== documentID)) return null;
    if (typeof src.duplicate !== "function") return null;
    var tmp = null;
    try {
      tmp = await (await fs.getTemporaryFolder()).createFile(
        "krea-dup-" + Date.now() + ".png", { overwrite: true }
      );
      var cap = capPx || MAX_PX;
      return await withModal(async function () {
        // mergeLayersOnly=true：只复制拼合结果，避免把整个 PSD 图层结构复制一遍。
        var dup = await src.duplicate("Krea Capture " + Date.now(), true);
        try {
          var docWidth = boundNumber(dup.width);
          var docHeight = boundNumber(dup.height);
          var left = Math.max(0, Math.round(boundNumber(selection.left)));
          var top = Math.max(0, Math.round(boundNumber(selection.top)));
          var right = Math.min(docWidth, Math.round(boundNumber(selection.right)));
          var bottom = Math.min(docHeight, Math.round(boundNumber(selection.bottom)));
          if (right <= left || bottom <= top) return null;
          // 拼合会把透明区域衬到当前背景色（默认白色），避免 PNG 透出黑底。
          await dup.flatten();
          await dup.crop({ left: left, top: top, right: right, bottom: bottom });
          var width = right - left;
          var height = bottom - top;
          if (width > cap || height > cap) {
            var scale = Math.min(cap / width, cap / height);
            await dup.resizeImage(
              Math.max(1, Math.round(width * scale)),
              Math.max(1, Math.round(height * scale)),
              72
            );
          }
          await dup.saveAs.png(tmp, { compression: 6 }, true);
          var bin = await tmp.read({ format: formats.binary });
          return bufferToBase64(bin);
        } finally {
          try { await dup.closeWithoutSaving(); }
          catch (eClose) { try { await dup.close(false); } catch (eClose2) { } }
        }
      }, "Krea Capture Duplicate");
    } catch (e) {
      console.warn("[Krea] duplicate capture failed", e);
      return null;
    } finally {
      try { if (tmp) await tmp.delete(); } catch (e2) { }
    }
  }

  /* --------------------------------------------- 空白占位图（纯文生图） */
  /**
   * 占位图必须是白色：旧实现用 new Uint8Array(...)（全 0）生成纯黑图，
   * 一旦被当作输入上传，后台只会看到一张黑图。白色与“空白画布”语义一致。
   */
  async function captureEmpty(width, height) {
    if (!psImaging) init();
    if (!psImaging) return null;
    var w = Math.max(1, Math.min(1024, Math.round(width)));
    var h = Math.max(1, Math.min(1024, Math.round(height)));
    try {
      var buf = new Uint8Array(w * h * 3);
      buf.fill(255);
      var img = await psImaging.createImageDataFromBuffer(buf, {
        width: w, height: h, components: 3, hasAlpha: false,
        colorSpace: "RGB", colorProfile: CAPTURE_PROFILE
      });
      try {
        return await psImaging.encodeImageData({ imageData: img, base64: true, type: "png" });
      } finally {
        try {
          if (img && typeof img.dispose === "function") img.dispose();
        } catch (e2) { /* ignore */ }
      }
    } catch (e) {
      return null;
    }
  }

  /**
   * 统一捕获入口。
   * @returns {Promise<{base64,width,height,bounds,source,blank}>}
   *   source: 'selection' 选区像素 | 'canvas' 整幅画布 | 'empty' 空白占位 | 'none'
   */
  async function capture(opts) {
    opts = opts || {};
    var doc = opts.doc || activeDoc();
    if (!doc) throw new Error("没有打开的文档");
    var sampling = opts.sampling === "selected" ? "selected" : "visible";
    var capPx = opts.maxPx || MAX_PX;

    // 生成页在点击「生成」时已经读取过一次选区；把同一份 bounds 传进来，
    // 避免在 modal / 权限边界上再读一次时选区刚好被取消。
    var sel = Object.prototype.hasOwnProperty.call(opts, "selection")
      ? opts.selection
      : await getSelection(doc);
    if (opts.requireSelection && !sel) throw new Error("selection required");
    var whole = { left: 0, top: 0, right: doc.width, bottom: doc.height };
    var bounds = sel || whole;

    var b64 = null;
    var b64Mime = null;
    var modern = null;
    var modernBlack = false;
    var modernEmpty = false;
    var diagnostics = [];
    if (hasModernCapture()) {
      // 先用非 modal 方式读像素：executeAsModal 会暂时接管 PS 的 UI，
      // 在低配置机器/大画布上容易让整个窗口闪一下。现代 imaging API 在多数
      // PS 版本上不需要 modal，只有确实读不到像素时才退回 modal 重试。
      try {
        modern = await captureModern(doc.id, bounds, sampling, capPx, doc);
      } catch (e0) {
        console.warn("[Krea] modern capture (non-modal) failed", e0);
        diagnostics.push("modern: " + ((e0 && e0.message) ? e0.message : String(e0)));
        modern = null;
      }
      modernEmpty = !!(modern && modern.empty);
      if (modern && modern.attempts) diagnostics = diagnostics.concat(modern.attempts);
      if (modern && modern.base64) {
        b64 = modern.base64;
        b64Mime = modern.mime || sniffMime(b64);
        modernBlack = !!modern.solidBlack;
      }

      // 非 modal 失败（无像素 / 纯黑）时再放进 modal 重试；
      // 若 modal 里拿到了有效像素，优先采用它。
      if (!modernEmpty && (!b64 || modernBlack)) {
        try {
          var modalModern = await withModal(function () {
            return captureModern(doc.id, bounds, sampling, capPx, doc);
          }, "Krea Capture Selection");
          if (modalModern && modalModern.attempts) {
            diagnostics = diagnostics.concat(modalModern.attempts);
          }
          if (modalModern && modalModern.base64 &&
              (!b64 || (modernBlack && !modalModern.solidBlack))) {
            modern = modalModern;
            b64 = modalModern.base64;
            b64Mime = modalModern.mime || sniffMime(b64);
            modernBlack = !!modalModern.solidBlack;
          }
          modernEmpty = !!(modalModern && modalModern.empty);
        } catch (e1) {
          console.warn("[Krea] modern capture (modal) failed", e1);
          diagnostics.push("modern-modal: " + ((e1 && e1.message) ? e1.message : String(e1)));
        }
      }
      if (modernEmpty) {
        console.log("[Krea] capture is empty (all reads transparent); skipping fallbacks");
      }
      // 现代 API 读不到像素 / 只读到纯黑像素、但选区确实存在时，
      // 再用兼容捕获兜底一次，避免把黑图当成选区内容送给模型。
      if (sel && !modernEmpty && (!b64 || modernBlack)) {
        console.log("[Krea] modern capture returned " +
          (modernBlack ? "solid black" : "no pixels") +
          "; trying legacy capture");
        var legacy = null;
        try {
          legacy = await captureLegacy(bounds, sampling, capPx);
          if (!legacy && sampling === "selected") {
            legacy = await captureLegacy(bounds, "visible", capPx);
          }
        } catch (e2) {
          console.warn("[Krea] legacy capture failed", e2);
        }
        if (legacy) {
          b64 = legacy;
          b64Mime = sniffMime(legacy);
          modernBlack = false;
        } else {
          diagnostics.push("legacy: no pixels");
        }
      }
      // 最终兜底：复制文档 -> 拼合 -> 裁剪 -> 另存。完全不依赖 imaging/剪贴板，
      // 专门处理「所有 API 都能读文档，但就是读不到选区像素」的 PS 版本。
      if (sel && !modernEmpty && (!b64 || modernBlack)) {
        var dup = await captureByDuplicate(bounds, capPx, doc.id);
        if (dup) {
          b64 = dup;
          b64Mime = sniffMime(dup);
          modernBlack = false;
          console.log("[Krea] duplicate capture succeeded");
        } else {
          diagnostics.push("duplicate: no pixels");
        }
      }
    } else {
      b64 = await captureLegacy(bounds, sampling, capPx);
      if (b64) b64Mime = sniffMime(b64);
      else diagnostics.push("legacy: no pixels");
      if (sel && !b64) {
        var dupLegacy = await captureByDuplicate(bounds, capPx, doc.id);
        if (dupLegacy) {
          b64 = dupLegacy;
          b64Mime = sniffMime(dupLegacy);
        } else {
          diagnostics.push("duplicate: no pixels");
        }
      }
    }
    if (b64) {
      var s1 = selectionSize(bounds);
      return {
        base64: b64, mime: b64Mime || sniffMime(b64), width: s1.width, height: s1.height,
        bounds: bounds, source: sel ? "selection" : "canvas", blank: false,
        hasSelection: !!sel
      };
    }
    // 有选区但像素读取失败时，绝不能返回一张全 0 的占位图：它会以纯黑图
    // 出现在 Krea 后台，模型也会把黑底当成选区内容。让调用方提示用户重试。
    if (sel) {
      var sSel = selectionSize(bounds);
      return {
        base64: null, mime: null, width: sSel.width, height: sSel.height,
        bounds: bounds, source: "none", blank: true, hasSelection: true,
        reason: diagnostics.join("; ").slice(0, 500)
      };
    }
    // 无选区的整幅画布捕获失败：给一张白色占位图（不是黑图），让模型只按比例出图。
    // createImageDataFromBuffer / encodeImageData 同样放进 modal，避免旧版 PS 返回空数据。
    var empty = await withModal(function () {
      return captureEmpty(bounds.right - bounds.left, bounds.bottom - bounds.top);
    }, "Krea Capture Placeholder");
    var s2 = selectionSize(bounds);
    if (empty) {
      return {
        base64: empty, mime: sniffMime(empty), width: s2.width, height: s2.height,
        bounds: bounds, source: "empty", blank: true, hasSelection: false
      };
    }
    return {
      base64: null, mime: null, width: s2.width, height: s2.height,
      bounds: bounds, source: "none", blank: true, hasSelection: false
    };
  }

  /* ------------------------------------------------------------ 结果置入 */
  async function writePng(base64, fileName) {
    var dir = await fs.getDataFolder();
    var file = await dir.createEntry(fileName || "krea-output.png", { overwrite: true });
    var bytes = window.KREA_STORE.b64ToBytes(stripDataUrl(base64));
    await file.write(bytes.buffer, { format: formats.binary });
    return file;
  }

  /**
   * 把结果图片置入文档。
   * @param opts {base64, docId, selection, mode:'newLayer'|'replace'|'newDocument', name}
   */
  async function place(opts) {
    var base64 = opts.base64;
    if (!base64) throw new Error("没有可置入的图片");
    var mode = opts.mode || "newLayer";
    var fileName = "krea-" + Date.now() + ".png";
    var file = await writePng(base64, fileName);
    var token = fs.createSessionToken(file);
    var openedFileDirectly = false;

    try {
      // 文档创建、置入、缩放/位移、栅格化、删除旧图层都必须在 modal 作用域内
      return await withModal(async function () {
        var targetDoc = null;
        if (mode === "newDocument") {
          // 新画布直接 app.open 打开已经写好的 PNG：一次完成「建文档 + 置图」，
          // 不再走 documents.add + placeEvent。后者在部分 PS 版本上会先弹一个
          // 空白画布再置入大图，既闪屏又慢；app.open 只刷新一次文档窗口。
          if (psApp && typeof psApp.open === "function") {
            try {
              targetDoc = await psApp.open(file);
              openedFileDirectly = !!targetDoc;
            } catch (eOpen) {
              console.warn("[Krea] app.open failed; falling back to documents.add", eOpen);
              targetDoc = null;
            }
          }
          if (!targetDoc) {
            // 兼容不支持 app.open(entry) 的旧版 UXP：
            // 优先用调用方显式传入的宽高（对话页按生成图尺寸建画布）；
            // 其次用选区大小。两者都没有时不能再悄悄建 1024×1024 —— 那会把
            // 4K/5K 结果缩成 1K；直接报错让用户手动打开结果图更可控。
            var hasDocSize = opts.docWidth > 0 && opts.docHeight > 0;
            var hasSelSize = !!(opts.selection &&
              (opts.selection.right - opts.selection.left) > 0 &&
              (opts.selection.bottom - opts.selection.top) > 0);
            if (!hasDocSize && !hasSelSize) {
              throw new Error("无法读取生成图尺寸，无法创建新画布；请更新 Photoshop 后重试");
            }
            var w = hasDocSize
              ? Math.max(1, Math.round(opts.docWidth))
              : Math.max(1, Math.round(opts.selection.right - opts.selection.left));
            var h = hasDocSize
              ? Math.max(1, Math.round(opts.docHeight))
              : Math.max(1, Math.round(opts.selection.bottom - opts.selection.top));
            targetDoc = await psApp.documents.add({
              name: (opts.name || "Krea") + " Result",
              width: w, height: h, resolution: 72, mode: "RGBColorMode"
            });
          }
        } else {
          var doc = null;
          if (opts.docId) {
            var all = psApp.documents;
            for (var i = 0; i < all.length; i++) {
              if (all[i].id === opts.docId) { doc = all[i]; break; }
            }
            // 抓图时的原文档已关闭：绝不能悄悄落到当前文档（会把结果放进别的画布）。
            if (!doc) throw new Error("原文档已关闭，无法置入结果");
          }
          targetDoc = doc || activeDoc();
        }
        if (!targetDoc) throw new Error("目标文档不存在");

        // placeEvent / rasterize 都作用在「当前活动文档」上。生成期间用户可能切到
        // 别的文档，因此必须先把快照里的目标文档激活，再置入并校验，绝不能只按
        // id 找到文档却继续操作当前最前面的那个。
        try {
          await psAction.batchPlay([
            { _obj: "select", _target: [{ _ref: "document", _id: targetDoc.id }] }
          ], {});
          if (psApp.activeDocument && psApp.activeDocument.id !== targetDoc.id) {
            throw new Error("无法激活目标文档");
          }
          targetDoc = psApp.activeDocument || targetDoc;
        } catch (eActivate) {
          throw new Error("目标文档已关闭或无法切换，请切回原文档后重试");
        }

        var prevLayerId = null;
        var prevLayer = null;
        var replaceSkipped = null;
        if (mode === "replace") {
          try {
            var act = targetDoc.activeLayers;
            if (act && act.length) { prevLayerId = act[0].id; prevLayer = act[0]; }
          } catch (e) { /* ignore */ }
        }

        if (!openedFileDirectly) {
          // modal 作用域内 batchPlay 本身就是同步执行，await 即保证置入完成；
          // 这里不再传 synchronousExecution（部分 PS 版本在 modal 内会直接报错）
          await psAction.batchPlay([
            { _obj: "placeEvent", null: { _path: token, _kind: "local" }, linked: false }
          ], {});
        }

        var layer = targetDoc.activeLayers[0];
        try { layer.name = opts.name || "Krea"; } catch (eName) { /* 背景图层可能不可改名 */ }
        if (opts.selection && mode !== "newDocument") {
          var selW = opts.selection.right - opts.selection.left;
          var selH = opts.selection.bottom - opts.selection.top;
          try {
            var b = layer.bounds;
            var sw = (b.right - b.left) || 1;
            var sh = (b.bottom - b.top) || 1;
            await layer.scale((selW / sw) * 100, (selH / sh) * 100);
            // 缩放会改变图层 bounds，必须重新读取后再定位；
            // 用缩放前的 b.left/b.top 计算会在非 1:1 缩放时产生偏移。
            var b2 = layer.bounds;
            await layer.translate(opts.selection.left - b2.left, opts.selection.top - b2.top);
          } catch (e2) { /* 保持原位 */ }
        }
        try { await layer.rasterize(); } catch (e3) { /* 已是像素图层 */ }

        if (mode === "replace" && prevLayerId) {
          // 结果图层只有选区那么大，直接删掉原图层会把选区外的像素一起删掉。
          // 正确做法（与原版 Krea 面板一致）：把结果移到原图层正上方，再向下合并，
          // 这样选区外内容、图层顺序都保留下来；锁定/合并失败时保留两个图层。
          try {
            var prev = prevLayer;
            if (!prev || prev.id !== prevLayerId) {
              prev = null;
              for (var k = 0; k < targetDoc.layers.length; k++) {
                if (targetDoc.layers[k].id === prevLayerId) { prev = targetDoc.layers[k]; break; }
              }
            }
            var locked = false;
            try { locked = !!(prev && prev.locked) || !!layer.locked; } catch (eLock) { locked = false; }
            if (prev && prev.id !== layer.id && !locked) {
              await layer.move(prev, "placeBefore");
              targetDoc.activeLayers = [layer];
              var merged = await psAction.batchPlay([{ _obj: "mergeLayersNew" }], {});
              if (merged && merged[0] && merged[0].message) throw new Error(merged[0].message);
              var top = targetDoc.activeLayers[0];
              if (top) {
                top.name = opts.name || "Krea";
                layer = top;
              }
            } else {
              // 锁定 / 找不到原图层：保留新图层，并把原因交回 UI 提示用户。
              replaceSkipped = locked ? "locked" : "missing";
            }
          } catch (e4) {
            // 合并失败：结果作为新图层保留，原图层不动
            replaceSkipped = "merge";
          }
        }
        if (mode === "replace" && !prevLayerId) replaceSkipped = "missing";

        return {
          documentId: targetDoc.id,
          layerId: layer.id,
          name: layer.name,
          replaceSkipped: replaceSkipped
        };
      }, "Krea Place Result");
    } finally {
      // app.open 打开的新文档仍引用这个 PNG；删掉磁盘文件会导致后续「存储」失败。
      // 其余置入方式（当前画布 / 替换）已经复制为图层，可以安全删除临时文件。
      if (!openedFileDirectly) {
        try { await file.delete(); } catch (e5) { /* ignore */ }
      }
    }
  }

  /* -------------------------------------------------------------- 羽化边缘 */
  /**
   * 羽化边缘（对齐原版 KreaForPs 的行为）：基于当前选区生成/重建「羽化蒙版」，
   * 生效范围 = 选区向内收缩 amount 再羽化 amount。amount = 0 时直接用选区建蒙版。
   * 内部已自带 executeAsModal，调用方无需再包一层。
   */
  async function feather(amount) {
    // 由本层自己开 modal，调用方（main.js）不要再包一层，否则会嵌套报错
    return await withModal(function () { return featherCore(amount); }, "Krea Feather Edges");
  }

  async function featherCore(amount) {
    var doc = activeDoc();
    if (!doc) throw new Error("没有打开的文档");
    var px = Math.max(0, Math.round(amount || 0));

    var layerRes = await psAction.batchPlay([
      { _obj: "get", _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }] }
    ], {});
    var hasMask = !!(layerRes && layerRes[0] && layerRes[0].userMaskEnabled);

    if (hasMask) {
      // 已有蒙版：白底重铺 + 羽化边缘 + 反相后涂黑，等价于重建一个羽化蒙版
      await psAction.batchPlay([{ _obj: "select", _target: [{ _ref: "channel", _enum: "channel", _value: "mask" }] }], {});
      await psAction.batchPlay([{ _obj: "fill", using: { _enum: "fillContents", _value: "white" } }], {});
      await psAction.batchPlay([{
        _obj: "set",
        _target: [{ _ref: "channel", _property: "selection" }],
        to: { _ref: "channel", _enum: "channel", _value: "transparencyEnum" }
      }], {});
      if (px > 0) {
        await psAction.batchPlay([{ _obj: "contract", by: { _unit: "pixelsUnit", _value: px } }], {});
        await psAction.batchPlay([{ _obj: "feather", radius: { _unit: "pixelsUnit", _value: px } }], {});
      }
      await psAction.batchPlay([{ _obj: "inverse" }], {});
      await psAction.batchPlay([{ _obj: "select", _target: [{ _ref: "channel", _enum: "channel", _value: "mask" }] }], {});
      await psAction.batchPlay([{ _obj: "fill", using: { _enum: "fillContents", _value: "black" } }], {});
      await psAction.batchPlay([{ _obj: "select", _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }] }], {});
    }

    // 基于当前选区创建羽化蒙版
    await psAction.batchPlay([{
      _obj: "set",
      _target: [{ _ref: "channel", _property: "selection" }],
      to: { _ref: "channel", _enum: "channel", _value: "transparencyEnum" }
    }], {});
    if (px > 0) {
      await psAction.batchPlay([{ _obj: "contract", by: { _unit: "pixelsUnit", _value: px } }], {});
      await psAction.batchPlay([{ _obj: "feather", radius: { _unit: "pixelsUnit", _value: px } }], {});
    }
    await psAction.batchPlay([{
      _obj: "make",
      new: { _class: "channel" },
      at: { _ref: "channel", _enum: "channel", _value: "mask" },
      using: { _enum: "userMaskEnabled", _value: "revealSelection" }
    }], {});
    return true;
  }

  /* -------------------------------------------------------------- 文件 */
  async function pickImageFiles(multiple) {
    try {
      var files = await fs.getFileForOpening({
        types: ["jpg", "jpeg", "png", "webp"],
        allowMultiple: !!multiple
      });
      if (!files) return [];
      return Array.isArray(files) ? files : [files];
    } catch (e) {
      return [];
    }
  }

  async function pickJsonFile() {
    try {
      var files = await fs.getFileForOpening({ types: ["json"] });
      if (!files) return null;
      return Array.isArray(files) ? files[0] : files;
    } catch (e) {
      return null;
    }
  }

  /**
   * 保存文本文件（词库导出）。
   * 优先弹出系统保存对话框；旧版 UXP 没有 getFileForSaving 时退回插件数据目录。
   * 返回 { name, nativePath }，用户取消时返回 null。
   */
  async function saveTextFile(fileName, text) {
    var name = String(fileName || ("krea-export-" + Date.now() + ".json"));
    var entry = null;
    var fromDialog = false;
    var canDialog = !!(fs && typeof fs.getFileForSaving === "function");
    if (canDialog) {
      try {
        entry = await fs.getFileForSaving(name, { types: ["json"] });
        if (!entry) return null;
        fromDialog = true;
      } catch (e) {
        entry = null;
      }
    }
    if (!entry) {
      var dir = await fs.getDataFolder();
      entry = await dir.createEntry(name, { overwrite: true });
    }
    var body = String(text === undefined || text === null ? "" : text);
    try {
      if (formats && formats.utf8) await entry.write(body, { format: formats.utf8 });
      else await entry.write(body);
    } catch (eWrite) {
      // 个别 UXP 版本不接受 write 的第二个参数，退回默认 UTF-8 文本写入。
      await entry.write(body);
    }

    var nativePath = "";
    try { nativePath = entry.nativePath || ""; } catch (e1) { /* ignore */ }
    if (!nativePath && !fromDialog) {
      try {
        var folder = await fs.getDataFolder();
        var dirPath = String(folder.nativePath || "");
        if (dirPath) {
          var sep = dirPath.indexOf("\\") >= 0 ? "\\" : "/";
          nativePath = dirPath.replace(/[\\/]+$/, "") + sep + String(entry.name || name);
        }
      } catch (e2) { /* ignore */ }
    }
    return { name: entry.name || name, nativePath: nativePath };
  }

  function imageSizeFromBytes(bytes) {
    try {
      var b = bytes;
      function u32(o) { return ((b[o] << 24) >>> 0) + (b[o + 1] << 16) + (b[o + 2] << 8) + b[o + 3]; }
      if (b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
        return { width: u32(16), height: u32(20) };
      }
      if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
        var i = 2;
        while (i + 9 < b.length) {
          if (b[i] !== 0xff) { i++; continue; }
          var marker = b[i + 1];
          // 0xff 可能作为填充字节重复出现；TEM(0x01) 与 RSTn/SOI/EOI 都没有长度字段。
          if (marker === 0xff) { i++; continue; }
          if (marker === 0x01 || marker === 0xd8 || marker === 0xd9 ||
              (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
          var len = (b[i + 2] << 8) | b[i + 3];
          var isSof = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) ||
            (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
          if (isSof) return { width: (b[i + 7] << 8) | b[i + 8], height: (b[i + 5] << 8) | b[i + 6] };
          if (len < 2) break;
          i += 2 + len;
        }
      }
      if (b.length > 30 && String.fromCharCode(b[0], b[1], b[2], b[3]) === "RIFF" &&
        String.fromCharCode(b[8], b[9], b[10], b[11]) === "WEBP") {
        var fmt = String.fromCharCode(b[12], b[13], b[14], b[15]);
        if (fmt === "VP8X") return { width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
        if (fmt === "VP8 ") return { width: (b[26] | (b[27] << 8)) & 0x3fff, height: (b[28] | (b[29] << 8)) & 0x3fff };
        if (fmt === "VP8L") {
          var bits = (b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)) >>> 0;
          return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
        }
      }
      if (b.length > 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
        // GIF87a / GIF89a
        return { width: b[6] | (b[7] << 8), height: b[8] | (b[9] << 8) };
      }
      // AVIF / HEIC（ISOBMFF）：结果图如果被后台转成 AVIF，旧解析会直接失败，
      // 上层只能兜底 1024。这里扫描 ispe box 读取真实画布尺寸。
      if (b.length > 16 && String.fromCharCode(b[4], b[5], b[6], b[7]) === "ftyp") {
        for (var p = 4; p + 16 <= b.length; p++) {
          if (b[p] === 0x69 && b[p + 1] === 0x73 && b[p + 2] === 0x70 && b[p + 3] === 0x65) {
            var avifW = u32(p + 8);
            var avifH = u32(p + 12);
            if (avifW > 0 && avifH > 0 && avifW <= 100000 && avifH <= 100000) {
              return { width: avifW, height: avifH };
            }
          }
        }
      }
    } catch (e) { /* unknown format */ }
    return { width: 0, height: 0 };
  }

  /** 从 base64 图片头读取宽高；无法识别时返回 null，交给调用方兜底。 */
  function imageSizeFromBase64(base64) {
    try {
      var size = imageSizeFromBytes(window.KREA_STORE.b64ToBytes(stripDataUrl(base64)));
      return (size && size.width > 0 && size.height > 0) ? size : null;
    } catch (e) {
      return null;
    }
  }

  async function fileToBase64(entry, maxBytes) {
    var bin = await entry.read({ format: formats.binary });
    var bytes = bin instanceof Uint8Array ? bin : new Uint8Array(bin);
    if (bytes.length > (maxBytes || MAX_REF_BYTES)) {
      throw new Error("文件过大（" + (bytes.length / 1048576).toFixed(1) + "MB），请压缩后再试");
    }
    var ext = String(entry.name || "").split(".").pop().toLowerCase();
    var extMime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" :
      ext === "webp" ? "image/webp" :
      ext === "gif" ? "image/gif" :
      ext === "avif" ? "image/avif" :
      ext === "heic" || ext === "heif" ? "image/heic" : "";
    var base64 = bufferToBase64(bytes);
    // 文件头优先：扩展名写错（.png 实际是 JPEG）时仍能给出正确 MIME。
    var mime = mimeFromBytes(bytes) || sniffMime(base64, "") || extMime || "image/png";
    var size = imageSizeFromBytes(bytes);
    return { base64: base64, name: entry.name, mime: mime, size: bytes.length, width: size.width, height: size.height };
  }

  /**
   * 参考图过大时按原版做法打开临时文档，缩放到最长边 maxPx，另存 PNG 后读回 base64。
   * 只用于「添加图片」，避免把几十 MB 的原图直接塞进请求体。
   */
  async function resizeReference(entry, maxPx) {
    var max = Math.max(64, Math.round(maxPx || 1024));
    var tmpName = "krea-ref-" + Date.now() + "-" + Math.floor(Math.random() * 100000) + ".png";
    var tmp = null;
    try {
      var b64 = await withModal(async function () {
        var doc = null;
        try {
          doc = await psApp.open(entry);
          if (doc.width > max || doc.height > max) {
            var scale = Math.min(max / doc.width, max / doc.height);
            await doc.resizeImage(
              Math.max(1, Math.round(doc.width * scale)),
              Math.max(1, Math.round(doc.height * scale))
            );
          }
          tmp = await (await fs.getTemporaryFolder()).createFile(tmpName, { overwrite: true });
          await doc.saveAs.png(tmp, { compression: 6 }, true);
          var bin = await tmp.read({ format: formats.binary });
          return bufferToBase64(bin);
        } finally {
          // 这里打开的是用户原始参考图，只读缩放后另存临时 PNG；
          // close(true) 会把缩放写回原文件，必须显式丢弃修改。
          try { if (doc) await doc.closeWithoutSaving(); }
          catch (e) { try { if (doc) await doc.close(false); } catch (e2) { /* ignore */ } }
        }
      }, "Krea Resize Reference");
      return b64;
    } finally {
      try { if (tmp) await tmp.delete(); } catch (e2) { /* ignore */ }
    }
  }

  return {
    init: init,
    version: version,
    hasModernCapture: hasModernCapture,
    activeDoc: activeDoc,
    docInfo: docInfo,
    getSelection: getSelection,
    capture: capture,
    writePng: writePng,
    place: place,
    feather: feather,
    pickImageFiles: pickImageFiles,
    pickJsonFile: pickJsonFile,
    saveTextFile: saveTextFile,
    imageSizeFromBase64: imageSizeFromBase64,
    fileToBase64: fileToBase64,
    resizeReference: resizeReference
  };
})();
