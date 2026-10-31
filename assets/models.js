/*
 * models.js — Krea 模型注册表（依据 Krea 官方 OpenAPI 生成）
 * 生成时间: 2026-10-16T13:13:23.086Z
 * 来源: https://api.krea.ai/openapi.json
 * 模型数: 44（图像 35 / 放大增强 9）
 *
 * field.ui   : text | textarea | number | slider | select | boolean | image | images | list | json
 * field.role : prompt | source | refs | mask | scene | seed | param
 * 请勿手工编辑；如需更新，重新运行生成脚本。
 */
window.KREA_MODELS = {
 "specVersion": "v1",
 "generatedAt": "2026-10-16T13:13:23.086Z",
 "source": "https://api.krea.ai/openapi.json",
 "defaultModel": "krea/krea-2/medium",
 "groups": [
  {
   "id": "enhance",
   "label": {
    "zh": "放大 / 增强",
    "en": "Upscale / Enhance"
   },
   "models": [
    "krea/enhance",
    "krea/legacy-enhance",
    "topaz/generative-enhance",
    "topaz/standard-enhance",
    "topaz/bloom-enhance",
    "topaz/bloom-2-enhance",
    "topaz/wonder-35-enhance",
    "magnific/creative-enhance",
    "magnific/precise-enhance"
   ]
  },
  {
   "id": "krea",
   "label": {
    "zh": "Krea 自研",
    "en": "Krea"
   },
   "models": [
    "krea/krea-2/medium",
    "krea/krea-2/large",
    "krea/krea-2/medium-turbo",
    "krea/krea-3"
   ]
  },
  {
   "id": "google",
   "label": {
    "zh": "Google",
    "en": "Google"
   },
   "models": [
    "google/nano-banana-pro",
    "google/nano-banana-2",
    "google/nano-banana-2.1",
    "google/nano-banana-flash-lite",
    "google/nano-banana"
   ]
  },
  {
   "id": "openai",
   "label": {
    "zh": "OpenAI",
    "en": "OpenAI"
   },
   "models": [
    "openai/gpt-image",
    "openai/gpt-image-2",
    "openai/gpt-image-2.5-flare",
    "openai/gpt-image-2.5-sunburst"
   ]
  },
  {
   "id": "ideogram",
   "label": {
    "zh": "Ideogram",
    "en": "Ideogram"
   },
   "models": [
    "ideogram/ideogram-4.5",
    "ideogram/ideogram-2-turbo",
    "ideogram/ideogram-3",
    "ideogram/ideogram-4.5-precise"
   ]
  },
  {
   "id": "bfl",
   "label": {
    "zh": "Black Forest Labs",
    "en": "Black Forest Labs"
   },
   "models": [
    "bfl/flux-1-dev",
    "bfl/flux-1-kontext-dev",
    "bfl/flux-1.1-pro",
    "bfl/flux-1.1-pro-ultra"
   ]
  },
  {
   "id": "bytedance",
   "label": {
    "zh": "字节跳动",
    "en": "ByteDance"
   },
   "models": [
    "bytedance/seedream-4",
    "bytedance/seedream-5-lite",
    "bytedance/seedream-5-pro",
    "bytedance/seededit"
   ]
  },
  {
   "id": "xai",
   "label": {
    "zh": "xAI",
    "en": "xAI"
   },
   "models": [
    "xai/grok-imagine-2",
    "xai/grok-imagine-2-edit"
   ]
  },
  {
   "id": "meta",
   "label": {
    "zh": "Meta",
    "en": "Meta"
   },
   "models": [
    "meta/muse-image"
   ]
  },
  {
   "id": "alibaba",
   "label": {
    "zh": "阿里通义",
    "en": "Alibaba"
   },
   "models": [
    "alibaba/qwen-image-3",
    "alibaba/qwen-image-2.1"
   ]
  },
  {
   "id": "luma",
   "label": {
    "zh": "Luma",
    "en": "Luma"
   },
   "models": [
    "luma/uni-1"
   ]
  },
  {
   "id": "recraft",
   "label": {
    "zh": "Recraft",
    "en": "Recraft"
   },
   "models": [
    "recraft/recraft-v4.1-flash"
   ]
  },
  {
   "id": "qwen",
   "label": {
    "zh": "Qwen",
    "en": "Qwen"
   },
   "models": [
    "qwen/2512"
   ]
  },
  {
   "id": "z-image",
   "label": {
    "zh": "Z-Image",
    "en": "Z-Image"
   },
   "models": [
    "z-image/z-image"
   ]
  },
  {
   "id": "runway",
   "label": {
    "zh": "Runway",
    "en": "Runway"
   },
   "models": [
    "runway/gen-4-image"
   ]
  }
 ],
 "models": {
  "krea/krea-2/medium": {
   "id": "krea/krea-2/medium",
   "kind": "image",
   "label": {
    "zh": "Krea 2 Medium（快）",
    "en": "Krea 2 Medium (fast)"
   },
   "endpoint": "/generate/image/krea/krea-2/medium",
   "vendor": "krea",
   "summary": "Krea 2 Medium",
   "desc": "Best for expressive illustrations.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "styles",
     "type": "array",
     "required": false,
     "ui": "style_ids",
     "role": "param",
     "desc": "Styles (typically LoRAs) to use for the generation",
     "itemType": "object",
     "itemProps": [
      "id",
      "strength"
     ],
     "label": {
      "zh": "Styles",
      "en": "Styles"
     }
    },
    {
     "name": "image_style_references",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "refs",
     "desc": "Image style references. (0 = no style influence, 1 = maximum). Default 0.5.",
     "itemType": "object",
     "itemProps": [
      "strength",
      "url"
     ],
     "wrap": "strength",
     "label": {
      "zh": "Image Style References",
      "en": "Image Style References"
     }
    },
    {
     "name": "aspect_ratio",
     "type": "string",
     "required": true,
     "ui": "select",
     "role": "param",
     "enum": [
      "1:1",
      "4:3",
      "3:2",
      "16:9",
      "2.35:1",
      "4:5",
      "3:4",
      "2:3",
      "9:16"
     ],
     "desc": "Aspect ratio. One of: 1:1, 4:3, 3:2, 16:9, 2.35:1, 4:5, 3:4, 2:3, 9:16.",
     "label": {
      "zh": "Aspect Ratio",
      "en": "Aspect Ratio"
     }
    },
    {
     "name": "resolution",
     "type": "string",
     "required": true,
     "ui": "select",
     "role": "param",
     "enum": [
      "1K"
     ],
     "desc": "Resolution scale. One of: 1K.",
     "label": {
      "zh": "Resolution",
      "en": "Resolution"
     }
    },
    {
     "name": "creativity",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "raw",
      "low",
      "medium",
      "high"
     ],
     "default": "low",
     "desc": "Prompt expansion mode. `raw` disables prompt expansion; `low`, `medium`, and `high` control expansion strength. This does not affect the K2 Intensity, Complexity, or Movement slider LoRAs.",
     "label": {
      "zh": "Creativity",
      "en": "Creativity"
     }
    },
    {
     "name": "intensity",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0,
     "min": -100,
     "max": 100,
     "desc": "K2 Intensity slider value from -100 to 100. Use 0 for neutral/no slider LoRA.",
     "step": 1,
     "label": {
      "zh": "Intensity",
      "en": "Intensity"
     }
    },
    {
     "name": "complexity",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0,
     "min": -100,
     "max": 100,
     "desc": "K2 Complexity slider value from -100 to 100. Use 0 for neutral/no slider LoRA.",
     "step": 1,
     "label": {
      "zh": "Complexity",
      "en": "Complexity"
     }
    },
    {
     "name": "movement",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0,
     "min": -100,
     "max": 100,
     "desc": "K2 Movement slider value from -100 to 100. Use 0 for neutral/no slider LoRA.",
     "step": 1,
     "label": {
      "zh": "Movement",
      "en": "Movement"
     }
    },
    {
     "name": "moodboards",
     "type": "array",
     "required": false,
     "ui": "style_ids",
     "role": "param",
     "desc": "Moodboards to use for generation. Currently limited to one moodboard.",
     "itemType": "object",
     "itemProps": [
      "id",
      "strength"
     ],
     "label": {
      "zh": "Moodboards",
      "en": "Moodboards"
     }
    },
    {
     "name": "image_url",
     "type": "anyOf",
     "required": false,
     "ui": "image",
     "role": "source",
     "desc": "Optional source image for image-to-image generation. When provided, generation starts from this image instead of pure noise. Control how much it changes with `strength`.",
     "wrap": "single",
     "label": {
      "zh": "Image Url",
      "en": "Image Url"
     }
    },
    {
     "name": "strength",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.99,
     "min": 0,
     "max": 1,
     "desc": "Denoising strength when `image_url` is provided. 0 keeps the input image, 1 fully replaces it (the input image is ignored). Has no effect without `image_url`. Default 0.99.",
     "step": 0.01,
     "label": {
      "zh": "Strength",
      "en": "Strength"
     }
    }
   ],
   "roles": {
    "source": "image_url",
    "refs": [
     "image_style_references"
    ],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "single",
    "wrappedRefs": [
     "image_style_references"
    ],
    "hasStrength": true
   }
  },
  "krea/krea-2/large": {
   "id": "krea/krea-2/large",
   "kind": "image",
   "label": {
    "zh": "Krea 2 Large（高质量）",
    "en": "Krea 2 Large (quality)"
   },
   "endpoint": "/generate/image/krea/krea-2/large",
   "vendor": "krea",
   "summary": "Krea 2 Large",
   "desc": "Best for expressive photorealism.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "styles",
     "type": "array",
     "required": false,
     "ui": "style_ids",
     "role": "param",
     "desc": "Styles (typically LoRAs) to use for the generation",
     "itemType": "object",
     "itemProps": [
      "id",
      "strength"
     ],
     "label": {
      "zh": "Styles",
      "en": "Styles"
     }
    },
    {
     "name": "image_style_references",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "refs",
     "desc": "Image style references. (0 = no style influence, 1 = maximum). Default 0.5.",
     "itemType": "object",
     "itemProps": [
      "strength",
      "url"
     ],
     "wrap": "strength",
     "label": {
      "zh": "Image Style References",
      "en": "Image Style References"
     }
    },
    {
     "name": "aspect_ratio",
     "type": "string",
     "required": true,
     "ui": "select",
     "role": "param",
     "enum": [
      "1:1",
      "4:3",
      "3:2",
      "16:9",
      "2.35:1",
      "4:5",
      "3:4",
      "2:3",
      "9:16"
     ],
     "desc": "Aspect ratio. One of: 1:1, 4:3, 3:2, 16:9, 2.35:1, 4:5, 3:4, 2:3, 9:16.",
     "label": {
      "zh": "Aspect Ratio",
      "en": "Aspect Ratio"
     }
    },
    {
     "name": "resolution",
     "type": "string",
     "required": true,
     "ui": "select",
     "role": "param",
     "enum": [
      "1K"
     ],
     "desc": "Resolution scale. One of: 1K.",
     "label": {
      "zh": "Resolution",
      "en": "Resolution"
     }
    },
    {
     "name": "creativity",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "raw",
      "low",
      "medium",
      "high"
     ],
     "default": "low",
     "desc": "Prompt expansion mode. `raw` disables prompt expansion; `low`, `medium`, and `high` control expansion strength. This does not affect the K2 Intensity, Complexity, or Movement slider LoRAs.",
     "label": {
      "zh": "Creativity",
      "en": "Creativity"
     }
    },
    {
     "name": "intensity",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0,
     "min": -100,
     "max": 100,
     "desc": "K2 Intensity slider value from -100 to 100. Use 0 for neutral/no slider LoRA.",
     "step": 1,
     "label": {
      "zh": "Intensity",
      "en": "Intensity"
     }
    },
    {
     "name": "complexity",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0,
     "min": -100,
     "max": 100,
     "desc": "K2 Complexity slider value from -100 to 100. Use 0 for neutral/no slider LoRA.",
     "step": 1,
     "label": {
      "zh": "Complexity",
      "en": "Complexity"
     }
    },
    {
     "name": "movement",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0,
     "min": -100,
     "max": 100,
     "desc": "K2 Movement slider value from -100 to 100. Use 0 for neutral/no slider LoRA.",
     "step": 1,
     "label": {
      "zh": "Movement",
      "en": "Movement"
     }
    },
    {
     "name": "moodboards",
     "type": "array",
     "required": false,
     "ui": "style_ids",
     "role": "param",
     "desc": "Moodboards to use for generation. Currently limited to one moodboard.",
     "itemType": "object",
     "itemProps": [
      "id",
      "strength"
     ],
     "label": {
      "zh": "Moodboards",
      "en": "Moodboards"
     }
    },
    {
     "name": "image_url",
     "type": "anyOf",
     "required": false,
     "ui": "image",
     "role": "source",
     "desc": "Optional source image for image-to-image generation. When provided, generation starts from this image instead of pure noise. Control how much it changes with `strength`.",
     "wrap": "single",
     "label": {
      "zh": "Image Url",
      "en": "Image Url"
     }
    },
    {
     "name": "strength",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.99,
     "min": 0,
     "max": 1,
     "desc": "Denoising strength when `image_url` is provided. 0 keeps the input image, 1 fully replaces it (the input image is ignored). Has no effect without `image_url`. Default 0.99.",
     "step": 0.01,
     "label": {
      "zh": "Strength",
      "en": "Strength"
     }
    }
   ],
   "roles": {
    "source": "image_url",
    "refs": [
     "image_style_references"
    ],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "single",
    "wrappedRefs": [
     "image_style_references"
    ],
    "hasStrength": true
   }
  },
  "krea/krea-2/medium-turbo": {
   "id": "krea/krea-2/medium-turbo",
   "kind": "image",
   "label": {
    "zh": "Krea 2 Turbo（最快）",
    "en": "Krea 2 Turbo (fastest)"
   },
   "endpoint": "/generate/image/krea/krea-2/medium-turbo",
   "vendor": "krea",
   "summary": "Krea 2 Turbo",
   "desc": "Fastest medium quality Krea 2 model.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "styles",
     "type": "array",
     "required": false,
     "ui": "style_ids",
     "role": "param",
     "desc": "Styles (typically LoRAs) to use for the generation",
     "itemType": "object",
     "itemProps": [
      "id",
      "strength"
     ],
     "label": {
      "zh": "Styles",
      "en": "Styles"
     }
    },
    {
     "name": "image_style_references",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "refs",
     "desc": "Image style references. (0 = no style influence, 1 = maximum). Default 0.5.",
     "itemType": "object",
     "itemProps": [
      "strength",
      "url"
     ],
     "wrap": "strength",
     "label": {
      "zh": "Image Style References",
      "en": "Image Style References"
     }
    },
    {
     "name": "aspect_ratio",
     "type": "string",
     "required": true,
     "ui": "select",
     "role": "param",
     "enum": [
      "1:1",
      "4:3",
      "3:2",
      "16:9",
      "2.35:1",
      "4:5",
      "3:4",
      "2:3",
      "9:16"
     ],
     "desc": "Aspect ratio. One of: 1:1, 4:3, 3:2, 16:9, 2.35:1, 4:5, 3:4, 2:3, 9:16.",
     "label": {
      "zh": "Aspect Ratio",
      "en": "Aspect Ratio"
     }
    },
    {
     "name": "resolution",
     "type": "string",
     "required": true,
     "ui": "select",
     "role": "param",
     "enum": [
      "1K"
     ],
     "desc": "Resolution scale. One of: 1K.",
     "label": {
      "zh": "Resolution",
      "en": "Resolution"
     }
    },
    {
     "name": "creativity",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "raw",
      "low",
      "medium",
      "high"
     ],
     "default": "low",
     "desc": "Prompt expansion mode. `raw` disables prompt expansion; `low`, `medium`, and `high` control expansion strength. This does not affect the K2 Intensity, Complexity, or Movement slider LoRAs.",
     "label": {
      "zh": "Creativity",
      "en": "Creativity"
     }
    },
    {
     "name": "intensity",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0,
     "min": -100,
     "max": 100,
     "desc": "K2 Intensity slider value from -100 to 100. Use 0 for neutral/no slider LoRA.",
     "step": 1,
     "label": {
      "zh": "Intensity",
      "en": "Intensity"
     }
    },
    {
     "name": "complexity",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0,
     "min": -100,
     "max": 100,
     "desc": "K2 Complexity slider value from -100 to 100. Use 0 for neutral/no slider LoRA.",
     "step": 1,
     "label": {
      "zh": "Complexity",
      "en": "Complexity"
     }
    },
    {
     "name": "movement",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0,
     "min": -100,
     "max": 100,
     "desc": "K2 Movement slider value from -100 to 100. Use 0 for neutral/no slider LoRA.",
     "step": 1,
     "label": {
      "zh": "Movement",
      "en": "Movement"
     }
    },
    {
     "name": "moodboards",
     "type": "array",
     "required": false,
     "ui": "style_ids",
     "role": "param",
     "desc": "Moodboards to use for generation. Currently limited to one moodboard.",
     "itemType": "object",
     "itemProps": [
      "id",
      "strength"
     ],
     "label": {
      "zh": "Moodboards",
      "en": "Moodboards"
     }
    },
    {
     "name": "image_url",
     "type": "anyOf",
     "required": false,
     "ui": "image",
     "role": "source",
     "desc": "Optional source image for image-to-image generation. When provided, generation starts from this image instead of pure noise. Control how much it changes with `strength`.",
     "wrap": "single",
     "label": {
      "zh": "Image Url",
      "en": "Image Url"
     }
    },
    {
     "name": "strength",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.99,
     "min": 0,
     "max": 1,
     "desc": "Denoising strength when `image_url` is provided. 0 keeps the input image, 1 fully replaces it (the input image is ignored). Has no effect without `image_url`. Default 0.99.",
     "step": 0.01,
     "label": {
      "zh": "Strength",
      "en": "Strength"
     }
    }
   ],
   "roles": {
    "source": "image_url",
    "refs": [
     "image_style_references"
    ],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "single",
    "wrappedRefs": [
     "image_style_references"
    ],
    "hasStrength": true
   }
  },
  "krea/krea-3": {
   "id": "krea/krea-3",
   "kind": "image",
   "label": {
    "zh": "Krea 3（编辑，8 秒级）",
    "en": "Krea 3 (edit, <8s)"
   },
   "endpoint": "/generate/image/krea/krea-3",
   "vendor": "krea",
   "summary": "Krea 3 Beta",
   "desc": "Generate and edit images with Krea 3.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "thinking_mode",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "fast",
      "high"
     ],
     "label": {
      "zh": "Thinking Mode",
      "en": "Thinking Mode"
     }
    },
    {
     "name": "image_urls",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "source",
     "desc": "Reference image URLs to use for the generation",
     "itemType": "string",
     "wrap": "plain",
     "label": {
      "zh": "Image Urls",
      "en": "Image Urls"
     }
    },
    {
     "name": "resolution",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "1K",
      "2K"
     ],
     "label": {
      "zh": "Resolution",
      "en": "Resolution"
     }
    },
    {
     "name": "aspect_ratio",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "1:1",
      "4:5",
      "3:4",
      "2:3",
      "9:16",
      "5:4",
      "4:3",
      "3:2",
      "16:9",
      "21:9"
     ],
     "label": {
      "zh": "Aspect Ratio",
      "en": "Aspect Ratio"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "regional_edit",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "label": {
      "zh": "Regional Edit",
      "en": "Regional Edit"
     }
    }
   ],
   "roles": {
    "source": "image_urls",
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "plain",
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "ideogram/ideogram-4.5": {
   "id": "ideogram/ideogram-4.5",
   "kind": "image",
   "label": {
    "zh": "Ideogram 4.5",
    "en": "Ideogram 4.5"
   },
   "endpoint": "/generate/image/ideogram/ideogram-4.5",
   "vendor": "ideogram",
   "summary": "Ideogram 4.5",
   "desc": "Generate images or edit source images with prompts and up to five image references. Very low quality requires an image. Set preserve_source_size to keep the first source image dimensions; aspect_ratio and resolution are then ignored.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "seed",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "min": 0,
     "max": 2147483647,
     "step": 1,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "quality",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "very_low",
      "low",
      "medium",
      "high"
     ],
     "default": "high",
     "label": {
      "zh": "Quality",
      "en": "Quality"
     }
    },
    {
     "name": "preserve_source_size",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "label": {
      "zh": "Preserve Source Size",
      "en": "Preserve Source Size"
     }
    },
    {
     "name": "skip_prompt_expansion",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "label": {
      "zh": "Skip Prompt Expansion",
      "en": "Skip Prompt Expansion"
     }
    },
    {
     "name": "aspect_ratio",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "1:1",
      "4:3",
      "3:2",
      "16:9",
      "2.4:1",
      "4:5",
      "2:3",
      "9:16"
     ],
     "default": "1:1",
     "desc": "Aspect ratio. One of: 1:1, 4:3, 3:2, 16:9, 2.4:1, 4:5, 2:3, 9:16.",
     "label": {
      "zh": "Aspect Ratio",
      "en": "Aspect Ratio"
     }
    },
    {
     "name": "resolution",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "2K"
     ],
     "default": "2K",
     "desc": "Resolution scale. One of: 2K.",
     "label": {
      "zh": "Resolution",
      "en": "Resolution"
     }
    },
    {
     "name": "image_urls",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "source",
     "desc": "Up to five source or reference images for prompt-based editing. Omit for text-to-image generation.",
     "itemType": "string",
     "wrap": "plain",
     "label": {
      "zh": "Image Urls",
      "en": "Image Urls"
     }
    }
   ],
   "roles": {
    "source": "image_urls",
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "plain",
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "bfl/flux-1-dev": {
   "id": "bfl/flux-1-dev",
   "kind": "image",
   "label": {
    "zh": "Flux 1 Dev",
    "en": "Flux 1 Dev"
   },
   "endpoint": "/generate/image/bfl/flux-1-dev",
   "vendor": "bfl",
   "summary": "Flux.1 Dev",
   "desc": "Fast model. Best for LoRAs.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 2743092225,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "steps",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 25,
     "min": 1,
     "max": 100,
     "step": 1,
     "label": {
      "zh": "Steps",
      "en": "Steps"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1024,
     "min": 512,
     "max": 2368,
     "step": 1,
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1024,
     "min": 512,
     "max": 2368,
     "step": 1,
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "image_url",
     "type": "anyOf",
     "required": false,
     "ui": "image",
     "role": "source",
     "wrap": "single",
     "label": {
      "zh": "Image Url",
      "en": "Image Url"
     }
    },
    {
     "name": "styles",
     "type": "array",
     "required": false,
     "ui": "style_ids",
     "role": "param",
     "desc": "Styles (typically LoRAs) to use for the generation",
     "itemType": "object",
     "itemProps": [
      "id",
      "strength"
     ],
     "label": {
      "zh": "Styles",
      "en": "Styles"
     }
    },
    {
     "name": "strength",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1,
     "min": 0,
     "max": 1,
     "desc": "Denoising strength when an input image is provided. 0 keeps the input image, 1 fully replaces it.",
     "step": 0.01,
     "label": {
      "zh": "Strength",
      "en": "Strength"
     }
    },
    {
     "name": "guidance_scale",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 3,
     "min": 0,
     "max": 24,
     "desc": "Classifier-free guidance scale. Higher values follow the prompt more strictly. Default 3.0.",
     "step": 1,
     "label": {
      "zh": "Guidance Scale",
      "en": "Guidance Scale"
     }
    },
    {
     "name": "style_images",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "refs",
     "desc": "Image prompts to use for the generation",
     "itemType": "object",
     "itemProps": [
      "strength",
      "url"
     ],
     "wrap": "strength",
     "label": {
      "zh": "Style Images",
      "en": "Style Images"
     }
    },
    {
     "name": "image_style_references",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "refs",
     "desc": "Style references to use for the generation",
     "itemType": "object",
     "itemProps": [
      "strength",
      "url"
     ],
     "wrap": "strength",
     "label": {
      "zh": "Image Style References",
      "en": "Image Style References"
     }
    }
   ],
   "roles": {
    "source": "image_url",
    "refs": [
     "style_images",
     "image_style_references"
    ],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "single",
    "wrappedRefs": [
     "style_images",
     "image_style_references"
    ],
    "hasStrength": true
   }
  },
  "bfl/flux-1-kontext-dev": {
   "id": "bfl/flux-1-kontext-dev",
   "kind": "image",
   "label": {
    "zh": "Flux Kontext Dev（编辑）",
    "en": "Flux Kontext Dev (edit)"
   },
   "endpoint": "/generate/image/bfl/flux-1-kontext-dev",
   "vendor": "bfl",
   "summary": "Flux Kontext Dev",
   "desc": "Frontier model designed for image editing, optimized for Krea",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 1337,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "steps",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 28,
     "min": 1,
     "max": 100,
     "step": 1,
     "label": {
      "zh": "Steps",
      "en": "Steps"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1024,
     "min": 512,
     "max": 8192,
     "step": 1,
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1024,
     "min": 512,
     "max": 8192,
     "step": 1,
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "image_url",
     "type": "anyOf",
     "required": false,
     "ui": "image",
     "role": "source",
     "wrap": "single",
     "label": {
      "zh": "Image Url",
      "en": "Image Url"
     }
    },
    {
     "name": "guidance_scale",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 3,
     "min": 0,
     "max": 24,
     "desc": "Classifier-free guidance scale. Higher values follow the prompt more strictly. Default 3.0.",
     "step": 1,
     "label": {
      "zh": "Guidance Scale",
      "en": "Guidance Scale"
     }
    },
    {
     "name": "style_images",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "refs",
     "desc": "Image prompts to use for the generation",
     "itemType": "object",
     "itemProps": [
      "strength",
      "url"
     ],
     "wrap": "strength",
     "label": {
      "zh": "Style Images",
      "en": "Style Images"
     }
    },
    {
     "name": "strength",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1,
     "min": 0,
     "max": 1,
     "desc": "Denoising strength when an input image is provided. 0 keeps the input image, 1 fully replaces it.",
     "step": 0.01,
     "label": {
      "zh": "Strength",
      "en": "Strength"
     }
    }
   ],
   "roles": {
    "source": "image_url",
    "refs": [
     "style_images"
    ],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "single",
    "wrappedRefs": [
     "style_images"
    ],
    "hasStrength": true
   }
  },
  "google/nano-banana-pro": {
   "id": "google/nano-banana-pro",
   "kind": "image",
   "label": {
    "zh": "Nano Banana Pro",
    "en": "Nano Banana Pro"
   },
   "endpoint": "/generate/image/google/nano-banana-pro",
   "vendor": "google",
   "summary": "Nano Banana Pro",
   "desc": "World's most intelligent model.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "desc": "Width of the generated image.",
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "desc": "Height of the generated image.",
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "image_urls",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "source",
     "desc": "Image prompts to use for the generation.",
     "itemType": "string",
     "wrap": "plain",
     "label": {
      "zh": "Image Urls",
      "en": "Image Urls"
     }
    },
    {
     "name": "aspect_ratio",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "21:9",
      "1:1",
      "4:3",
      "3:2",
      "2:3",
      "5:4",
      "4:5",
      "3:4",
      "16:9",
      "9:16"
     ],
     "label": {
      "zh": "Aspect Ratio",
      "en": "Aspect Ratio"
     }
    },
    {
     "name": "resolution",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "1K",
      "2K",
      "4K"
     ],
     "default": "1K",
     "label": {
      "zh": "Resolution",
      "en": "Resolution"
     }
    }
   ],
   "roles": {
    "source": "image_urls",
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "plain",
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "google/nano-banana-2": {
   "id": "google/nano-banana-2",
   "kind": "image",
   "label": {
    "zh": "Nano Banana 2",
    "en": "Nano Banana 2"
   },
   "endpoint": "/generate/image/google/nano-banana-2",
   "vendor": "google",
   "summary": "Nano Banana 2",
   "desc": "Cheaper quality version of Nano Banana.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "desc": "Width of the generated image.",
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "desc": "Height of the generated image.",
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "image_urls",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "source",
     "desc": "Image prompts to use for the generation.",
     "itemType": "string",
     "wrap": "plain",
     "label": {
      "zh": "Image Urls",
      "en": "Image Urls"
     }
    },
    {
     "name": "aspect_ratio",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "4:1",
      "21:9",
      "1:1",
      "4:3",
      "3:2",
      "2:3",
      "5:4",
      "4:5",
      "3:4",
      "16:9",
      "9:16",
      "1:4",
      "1:8"
     ],
     "label": {
      "zh": "Aspect Ratio",
      "en": "Aspect Ratio"
     }
    },
    {
     "name": "resolution",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "1K",
      "2K",
      "4K"
     ],
     "default": "1K",
     "label": {
      "zh": "Resolution",
      "en": "Resolution"
     }
    }
   ],
   "roles": {
    "source": "image_urls",
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "plain",
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "google/nano-banana-2.1": {
   "id": "google/nano-banana-2.1",
   "kind": "image",
   "label": {
    "zh": "Nano Banana 2.1",
    "en": "Nano Banana 2.1"
   },
   "endpoint": "/generate/image/google/nano-banana-2.1",
   "vendor": "google",
   "summary": "Nano Banana 2.1",
   "desc": "Google's latest image model. Pro-level quality at Flash speed.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "desc": "Width of the generated image.",
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "desc": "Height of the generated image.",
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "image_urls",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "source",
     "desc": "Image prompts to use for the generation.",
     "itemType": "string",
     "wrap": "plain",
     "label": {
      "zh": "Image Urls",
      "en": "Image Urls"
     }
    },
    {
     "name": "aspect_ratio",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "4:1",
      "21:9",
      "1:1",
      "4:3",
      "3:2",
      "2:3",
      "5:4",
      "4:5",
      "3:4",
      "16:9",
      "9:16",
      "1:4",
      "1:8"
     ],
     "label": {
      "zh": "Aspect Ratio",
      "en": "Aspect Ratio"
     }
    },
    {
     "name": "resolution",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "1K",
      "2K",
      "4K"
     ],
     "default": "1K",
     "label": {
      "zh": "Resolution",
      "en": "Resolution"
     }
    },
    {
     "name": "thinking_level",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "minimal",
      "medium",
      "high"
     ],
     "default": "medium",
     "label": {
      "zh": "Thinking Level",
      "en": "Thinking Level"
     }
    }
   ],
   "roles": {
    "source": "image_urls",
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "plain",
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "google/nano-banana-flash-lite": {
   "id": "google/nano-banana-flash-lite",
   "kind": "image",
   "label": {
    "zh": "Nano Banana 2 Lite（快）",
    "en": "Nano Banana 2 Lite"
   },
   "endpoint": "/generate/image/google/nano-banana-flash-lite",
   "vendor": "google",
   "summary": "Nano Banana 2 Lite",
   "desc": "Fast Google image model.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "desc": "Width of the generated image.",
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "desc": "Height of the generated image.",
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "image_urls",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "source",
     "desc": "Image prompts to use for the generation.",
     "itemType": "string",
     "wrap": "plain",
     "label": {
      "zh": "Image Urls",
      "en": "Image Urls"
     }
    },
    {
     "name": "aspect_ratio",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "21:9",
      "1:1",
      "4:3",
      "3:2",
      "2:3",
      "5:4",
      "4:5",
      "3:4",
      "16:9",
      "9:16"
     ],
     "label": {
      "zh": "Aspect Ratio",
      "en": "Aspect Ratio"
     }
    }
   ],
   "roles": {
    "source": "image_urls",
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "plain",
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "google/nano-banana": {
   "id": "google/nano-banana",
   "kind": "image",
   "label": {
    "zh": "Nano Banana（原版）",
    "en": "Nano Banana"
   },
   "endpoint": "/generate/image/google/nano-banana",
   "vendor": "google",
   "summary": "Nano Banana",
   "desc": "Most versatile intelligent model.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "desc": "Width of the generated image.",
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "desc": "Height of the generated image.",
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "image_urls",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "source",
     "desc": "Image prompts to use for the generation.",
     "itemType": "string",
     "wrap": "plain",
     "label": {
      "zh": "Image Urls",
      "en": "Image Urls"
     }
    },
    {
     "name": "aspect_ratio",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "21:9",
      "1:1",
      "4:3",
      "3:2",
      "2:3",
      "5:4",
      "4:5",
      "3:4",
      "16:9",
      "9:16"
     ],
     "label": {
      "zh": "Aspect Ratio",
      "en": "Aspect Ratio"
     }
    }
   ],
   "roles": {
    "source": "image_urls",
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "plain",
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "bfl/flux-1.1-pro": {
   "id": "bfl/flux-1.1-pro",
   "kind": "image",
   "label": {
    "zh": "Flux 1 1 Pro",
    "en": "Flux 1 1 Pro"
   },
   "endpoint": "/generate/image/bfl/flux-1.1-pro",
   "vendor": "bfl",
   "summary": "Flux 1.1 Pro",
   "desc": "Advanced yet efficent model from BFL.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": true,
     "ui": "slider",
     "role": "param",
     "min": 256,
     "max": 1440,
     "step": 1,
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": true,
     "ui": "slider",
     "role": "param",
     "min": 256,
     "max": 1440,
     "step": 1,
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 1337,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    }
   ],
   "roles": {
    "source": null,
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "bfl/flux-1.1-pro-ultra": {
   "id": "bfl/flux-1.1-pro-ultra",
   "kind": "image",
   "label": {
    "zh": "Flux 1.1 Pro Ultra",
    "en": "Flux 1.1 Pro Ultra"
   },
   "endpoint": "/generate/image/bfl/flux-1.1-pro-ultra",
   "vendor": "bfl",
   "summary": "Flux 1.1 Pro Ultra",
   "desc": "BFL's highest quality text to image model.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1024,
     "min": 512,
     "max": 8192,
     "step": 1,
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1024,
     "min": 512,
     "max": 8192,
     "step": 1,
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 1337,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "raw",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": true,
     "label": {
      "zh": "Raw",
      "en": "Raw"
     }
    }
   ],
   "roles": {
    "source": null,
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "ideogram/ideogram-2-turbo": {
   "id": "ideogram/ideogram-2-turbo",
   "kind": "image",
   "label": {
    "zh": "Ideogram 2.0A Turbo",
    "en": "Ideogram 2.0A Turbo"
   },
   "endpoint": "/generate/image/ideogram/ideogram-2-turbo",
   "vendor": "ideogram",
   "summary": "Ideogram 2.0A Turbo",
   "desc": "Distilled version of Ideogram 2.0",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1024,
     "min": 512,
     "max": 8192,
     "step": 1,
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1024,
     "min": 512,
     "max": 8192,
     "step": 1,
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 1337,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    }
   ],
   "roles": {
    "source": null,
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "ideogram/ideogram-3": {
   "id": "ideogram/ideogram-3",
   "kind": "image",
   "label": {
    "zh": "Ideogram 3.0",
    "en": "Ideogram 3.0"
   },
   "endpoint": "/generate/image/ideogram/ideogram-3",
   "vendor": "ideogram",
   "summary": "Ideogram 3.0",
   "desc": "Highly aesthetic, general-purpose model.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1024,
     "min": 512,
     "max": 8192,
     "step": 1,
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1024,
     "min": 512,
     "max": 8192,
     "step": 1,
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 1337,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "character_reference_images",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "refs",
     "itemType": "string",
     "wrap": "plain",
     "label": {
      "zh": "Character Reference Images",
      "en": "Character Reference Images"
     }
    },
    {
     "name": "style_images",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "refs",
     "desc": "Image prompts to use for the generation",
     "itemType": "object",
     "itemProps": [
      "strength",
      "url"
     ],
     "wrap": "strength",
     "label": {
      "zh": "Style Images",
      "en": "Style Images"
     }
    }
   ],
   "roles": {
    "source": null,
    "refs": [
     "character_reference_images",
     "style_images"
    ],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "wrappedRefs": [
     "style_images"
    ],
    "hasStrength": false
   }
  },
  "runway/gen-4-image": {
   "id": "runway/gen-4-image",
   "kind": "image",
   "label": {
    "zh": "Runway Gen-4 Image",
    "en": "Runway Gen-4 Image"
   },
   "endpoint": "/generate/image/runway/gen-4-image",
   "vendor": "runway",
   "summary": "Runway Gen-4 Image",
   "desc": "Cinematic image model with references.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1024,
     "min": 512,
     "max": 8192,
     "step": 1,
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1024,
     "min": 512,
     "max": 8192,
     "step": 1,
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 1337,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "reference_images",
     "type": "array",
     "required": true,
     "ui": "images",
     "role": "refs",
     "itemType": "object",
     "itemProps": [
      "url",
      "tag"
     ],
     "wrap": "tag",
     "label": {
      "zh": "Reference Images",
      "en": "Reference Images"
     }
    }
   ],
   "roles": {
    "source": null,
    "refs": [
     "reference_images"
    ],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "wrappedRefs": [
     "reference_images"
    ],
    "hasStrength": false
   }
  },
  "openai/gpt-image": {
   "id": "openai/gpt-image",
   "kind": "image",
   "label": {
    "zh": "ChatGPT Image",
    "en": "ChatGPT Image"
   },
   "endpoint": "/generate/image/openai/gpt-image",
   "vendor": "openai",
   "summary": "ChatGPT Image",
   "desc": "Original ChatGPT image model.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1024,
     "min": 512,
     "max": 8192,
     "step": 1,
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1024,
     "min": 512,
     "max": 8192,
     "step": 1,
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "quality",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "low",
      "medium",
      "high",
      "auto"
     ],
     "default": "auto",
     "label": {
      "zh": "Quality",
      "en": "Quality"
     }
    },
    {
     "name": "image_urls",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "source",
     "desc": "Image prompts to use for the generation.",
     "itemType": "string",
     "wrap": "plain",
     "label": {
      "zh": "Image Urls",
      "en": "Image Urls"
     }
    },
    {
     "name": "styles",
     "type": "array",
     "required": false,
     "ui": "style_ids",
     "role": "param",
     "itemType": "object",
     "itemProps": [
      "id",
      "strength"
     ],
     "label": {
      "zh": "Styles",
      "en": "Styles"
     }
    }
   ],
   "roles": {
    "source": "image_urls",
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "plain",
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "openai/gpt-image-2": {
   "id": "openai/gpt-image-2",
   "kind": "image",
   "label": {
    "zh": "ChatGPT 2",
    "en": "ChatGPT 2"
   },
   "endpoint": "/generate/image/openai/gpt-image-2",
   "vendor": "openai",
   "summary": "ChatGPT 2",
   "desc": "Smart powerful model for editing.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "quality",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "low",
      "medium",
      "high",
      "auto"
     ],
     "default": "high",
     "label": {
      "zh": "Quality",
      "en": "Quality"
     }
    },
    {
     "name": "image_urls",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "source",
     "desc": "Image prompts to use for the generation.",
     "itemType": "string",
     "wrap": "plain",
     "label": {
      "zh": "Image Urls",
      "en": "Image Urls"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "desc": "Width of the generated image in pixels.",
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "desc": "Height of the generated image in pixels.",
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "aspect_ratio",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "16:9",
      "2:1",
      "3:2",
      "4:3",
      "1:1",
      "3:4",
      "2:3",
      "1:2",
      "9:16"
     ],
     "desc": "Aspect ratio. One of: 16:9, 2:1, 3:2, 4:3, 1:1, 3:4, 2:3, 1:2, 9:16.",
     "label": {
      "zh": "Aspect Ratio",
      "en": "Aspect Ratio"
     }
    },
    {
     "name": "resolution",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "1K",
      "2K",
      "4K"
     ],
     "desc": "Resolution scale. One of: 1K, 2K, 4K.",
     "label": {
      "zh": "Resolution",
      "en": "Resolution"
     }
    }
   ],
   "roles": {
    "source": "image_urls",
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "plain",
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "openai/gpt-image-2.5-flare": {
   "id": "openai/gpt-image-2.5-flare",
   "kind": "image",
   "label": {
    "zh": "GPT Image 2.5 Flare（透明背景）",
    "en": "GPT Image 2.5 Flare"
   },
   "endpoint": "/generate/image/openai/gpt-image-2.5-flare",
   "vendor": "openai",
   "summary": "GPT Image 2.5 Flare",
   "desc": "GPT Image 2.5 with transparent background support.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "quality",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "low",
      "medium",
      "high",
      "xhigh",
      "max"
     ],
     "default": "high",
     "label": {
      "zh": "Quality",
      "en": "Quality"
     }
    },
    {
     "name": "image_urls",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "source",
     "desc": "Image prompts to use for the generation.",
     "itemType": "string",
     "wrap": "plain",
     "label": {
      "zh": "Image Urls",
      "en": "Image Urls"
     }
    },
    {
     "name": "aspect_ratio",
     "type": "string",
     "required": true,
     "ui": "select",
     "role": "param",
     "enum": [
      "16:9",
      "2:1",
      "3:2",
      "4:3",
      "1:1",
      "3:4",
      "2:3",
      "1:2",
      "9:16"
     ],
     "desc": "Aspect ratio. One of: 16:9, 2:1, 3:2, 4:3, 1:1, 3:4, 2:3, 1:2, 9:16.",
     "label": {
      "zh": "Aspect Ratio",
      "en": "Aspect Ratio"
     }
    },
    {
     "name": "resolution",
     "type": "string",
     "required": true,
     "ui": "select",
     "role": "param",
     "enum": [
      "1K",
      "2K",
      "4K"
     ],
     "desc": "Resolution scale. One of: 1K, 2K, 4K.",
     "label": {
      "zh": "Resolution",
      "en": "Resolution"
     }
    },
    {
     "name": "background",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "transparent",
      "opaque",
      "auto"
     ],
     "desc": "Background of the generated image. `transparent` returns a cutout.",
     "label": {
      "zh": "Background",
      "en": "Background"
     }
    }
   ],
   "roles": {
    "source": "image_urls",
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "plain",
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "openai/gpt-image-2.5-sunburst": {
   "id": "openai/gpt-image-2.5-sunburst",
   "kind": "image",
   "label": {
    "zh": "GPT Image 2.5 Sunburst（最快）",
    "en": "GPT Image 2.5 Sunburst"
   },
   "endpoint": "/generate/image/openai/gpt-image-2.5-sunburst",
   "vendor": "openai",
   "summary": "GPT Image 2.5 Sunburst",
   "desc": "GPT Image 2.5, optimized for speed.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "quality",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "low",
      "medium",
      "high",
      "xhigh",
      "max"
     ],
     "default": "high",
     "label": {
      "zh": "Quality",
      "en": "Quality"
     }
    },
    {
     "name": "image_urls",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "source",
     "desc": "Image prompts to use for the generation.",
     "itemType": "string",
     "wrap": "plain",
     "label": {
      "zh": "Image Urls",
      "en": "Image Urls"
     }
    },
    {
     "name": "aspect_ratio",
     "type": "string",
     "required": true,
     "ui": "select",
     "role": "param",
     "enum": [
      "16:9",
      "2:1",
      "3:2",
      "4:3",
      "1:1",
      "3:4",
      "2:3",
      "1:2",
      "9:16"
     ],
     "desc": "Aspect ratio. One of: 16:9, 2:1, 3:2, 4:3, 1:1, 3:4, 2:3, 1:2, 9:16.",
     "label": {
      "zh": "Aspect Ratio",
      "en": "Aspect Ratio"
     }
    },
    {
     "name": "resolution",
     "type": "string",
     "required": true,
     "ui": "select",
     "role": "param",
     "enum": [
      "1K",
      "2K",
      "4K"
     ],
     "desc": "Resolution scale. One of: 1K, 2K, 4K.",
     "label": {
      "zh": "Resolution",
      "en": "Resolution"
     }
    }
   ],
   "roles": {
    "source": "image_urls",
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "plain",
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "xai/grok-imagine-2": {
   "id": "xai/grok-imagine-2",
   "kind": "image",
   "label": {
    "zh": "Grok Imagine 2",
    "en": "Grok Imagine 2"
   },
   "endpoint": "/generate/image/xai/grok-imagine-2",
   "vendor": "xai",
   "summary": "Grok Imagine 2.0",
   "desc": "xAI's image model with selectable quality and 2K output.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "quality",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "low",
      "medium"
     ],
     "default": "medium",
     "label": {
      "zh": "Quality",
      "en": "Quality"
     }
    },
    {
     "name": "aspect_ratio",
     "type": "string",
     "required": true,
     "ui": "select",
     "role": "param",
     "enum": [
      "2:1",
      "20:9",
      "19.5:9",
      "16:9",
      "3:2",
      "4:3",
      "1:1",
      "3:4",
      "2:3",
      "9:16",
      "9:19.5",
      "9:20",
      "1:2"
     ],
     "desc": "Aspect ratio. One of: 2:1, 20:9, 19.5:9, 16:9, 3:2, 4:3, 1:1, 3:4, 2:3, 9:16, 9:19.5, 9:20, 1:2.",
     "label": {
      "zh": "Aspect Ratio",
      "en": "Aspect Ratio"
     }
    },
    {
     "name": "resolution",
     "type": "string",
     "required": true,
     "ui": "select",
     "role": "param",
     "enum": [
      "1K",
      "2K"
     ],
     "desc": "Resolution scale. One of: 1K, 2K.",
     "label": {
      "zh": "Resolution",
      "en": "Resolution"
     }
    },
    {
     "name": "style_images",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "refs",
     "desc": "Image prompts to use for the generation",
     "itemType": "object",
     "itemProps": [
      "strength",
      "url"
     ],
     "wrap": "strength",
     "label": {
      "zh": "Style Images",
      "en": "Style Images"
     }
    }
   ],
   "roles": {
    "source": null,
    "refs": [
     "style_images"
    ],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "wrappedRefs": [
     "style_images"
    ],
    "hasStrength": false
   }
  },
  "xai/grok-imagine-2-edit": {
   "id": "xai/grok-imagine-2-edit",
   "kind": "image",
   "label": {
    "zh": "Grok Imagine 2（编辑）",
    "en": "Grok Imagine 2 (edit)"
   },
   "endpoint": "/generate/image/xai/grok-imagine-2-edit",
   "vendor": "xai",
   "summary": "Grok Imagine 2.0",
   "desc": "xAI's image editing model with natural language edit instructions",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "quality",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "low",
      "medium"
     ],
     "default": "medium",
     "label": {
      "zh": "Quality",
      "en": "Quality"
     }
    },
    {
     "name": "resolution",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "1K",
      "2K"
     ],
     "default": "1K",
     "label": {
      "zh": "Resolution",
      "en": "Resolution"
     }
    },
    {
     "name": "image_urls",
     "type": "array",
     "required": true,
     "ui": "images",
     "role": "source",
     "itemType": "string",
     "wrap": "plain",
     "label": {
      "zh": "Image Urls",
      "en": "Image Urls"
     }
    }
   ],
   "roles": {
    "source": "image_urls",
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "plain",
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "meta/muse-image": {
   "id": "meta/muse-image",
   "kind": "image",
   "label": {
    "zh": "Meta Muse Image",
    "en": "Meta Muse Image"
   },
   "endpoint": "/generate/image/meta/muse-image",
   "vendor": "meta",
   "summary": "Muse Image",
   "desc": "Meta’s agentic image model — it reasons about the prompt, pulls references from the web, and verifies the render before returning it.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "aspect_ratio",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "21:9",
      "16:9",
      "4:3",
      "3:2",
      "1:1",
      "2:3",
      "3:4",
      "9:16",
      "9:21"
     ],
     "label": {
      "zh": "Aspect Ratio",
      "en": "Aspect Ratio"
     }
    },
    {
     "name": "style_images",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "refs",
     "desc": "Image prompts to use for the generation",
     "itemType": "object",
     "itemProps": [
      "strength",
      "url"
     ],
     "wrap": "strength",
     "label": {
      "zh": "Style Images",
      "en": "Style Images"
     }
    }
   ],
   "roles": {
    "source": null,
    "refs": [
     "style_images"
    ],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "wrappedRefs": [
     "style_images"
    ],
    "hasStrength": false
   }
  },
  "alibaba/qwen-image-3": {
   "id": "alibaba/qwen-image-3",
   "kind": "image",
   "label": {
    "zh": "Qwen Image 3",
    "en": "Qwen Image 3"
   },
   "endpoint": "/generate/image/alibaba/qwen-image-3",
   "vendor": "alibaba",
   "summary": "Qwen Image 3",
   "desc": "Dense layouts with small, legible text.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "width",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1024,
     "min": 512,
     "max": 2048,
     "step": 1,
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1024,
     "min": 512,
     "max": 2048,
     "step": 1,
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 1337,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "style_images",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "refs",
     "desc": "Image prompts to use for the generation",
     "itemType": "object",
     "itemProps": [
      "strength",
      "url"
     ],
     "wrap": "strength",
     "label": {
      "zh": "Style Images",
      "en": "Style Images"
     }
    }
   ],
   "roles": {
    "source": null,
    "refs": [
     "style_images"
    ],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "wrappedRefs": [
     "style_images"
    ],
    "hasStrength": false
   }
  },
  "alibaba/qwen-image-2.1": {
   "id": "alibaba/qwen-image-2.1",
   "kind": "image",
   "label": {
    "zh": "Qwen Image 2.1",
    "en": "Qwen Image 2.1"
   },
   "endpoint": "/generate/image/alibaba/qwen-image-2.1",
   "vendor": "alibaba",
   "summary": "Qwen Image 2.1",
   "desc": "Transparent assets and identity-safe edits.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "width",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1024,
     "min": 512,
     "max": 2048,
     "step": 1,
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1024,
     "min": 512,
     "max": 2048,
     "step": 1,
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 1337,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "style_images",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "refs",
     "desc": "Image prompts to use for the generation",
     "itemType": "object",
     "itemProps": [
      "strength",
      "url"
     ],
     "wrap": "strength",
     "label": {
      "zh": "Style Images",
      "en": "Style Images"
     }
    },
    {
     "name": "background",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "transparent",
      "opaque",
      "auto"
     ],
     "desc": "Background of the generated image. `transparent` returns a cutout.",
     "label": {
      "zh": "Background",
      "en": "Background"
     }
    }
   ],
   "roles": {
    "source": null,
    "refs": [
     "style_images"
    ],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "wrappedRefs": [
     "style_images"
    ],
    "hasStrength": false
   }
  },
  "luma/uni-1": {
   "id": "luma/uni-1",
   "kind": "image",
   "label": {
    "zh": "Luma UNI-1",
    "en": "Luma UNI-1"
   },
   "endpoint": "/generate/image/luma/uni-1",
   "vendor": "luma",
   "summary": "Luma UNI-1",
   "desc": "Reasoning image model for prompt-faithful text to image.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1024,
     "min": 512,
     "max": 8192,
     "step": 1,
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1024,
     "min": 512,
     "max": 8192,
     "step": 1,
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "mode",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "standard",
      "max"
     ],
     "default": "standard",
     "label": {
      "zh": "Mode",
      "en": "Mode"
     }
    },
    {
     "name": "style",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "auto",
      "manga"
     ],
     "default": "auto",
     "label": {
      "zh": "Style",
      "en": "Style"
     }
    },
    {
     "name": "output_format",
     "type": "anyOf",
     "required": false,
     "ui": "json",
     "role": "param",
     "label": {
      "zh": "Output Format",
      "en": "Output Format"
     }
    },
    {
     "name": "web_search",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "label": {
      "zh": "Web Search",
      "en": "Web Search"
     }
    },
    {
     "name": "style_images",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "refs",
     "desc": "Image prompts to use for the generation",
     "itemType": "object",
     "itemProps": [
      "strength",
      "url"
     ],
     "wrap": "strength",
     "label": {
      "zh": "Style Images",
      "en": "Style Images"
     }
    }
   ],
   "roles": {
    "source": null,
    "refs": [
     "style_images"
    ],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "wrappedRefs": [
     "style_images"
    ],
    "hasStrength": false
   }
  },
  "recraft/recraft-v4.1-flash": {
   "id": "recraft/recraft-v4.1-flash",
   "kind": "image",
   "label": {
    "zh": "Recraft V4.1 Flash",
    "en": "Recraft V4.1 Flash"
   },
   "endpoint": "/generate/image/recraft/recraft-v4.1-flash",
   "vendor": "recraft",
   "summary": "Recraft V4.1 Flash",
   "desc": "Recraft’s fast tier for raster art, illustration, and photography.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "aspect_ratio",
     "type": "string",
     "required": true,
     "ui": "select",
     "role": "param",
     "enum": [
      "1:1",
      "4:3",
      "3:2",
      "16:9",
      "3:4",
      "2:3",
      "9:16"
     ],
     "desc": "Aspect ratio. One of: 1:1, 4:3, 3:2, 16:9, 3:4, 2:3, 9:16.",
     "label": {
      "zh": "Aspect Ratio",
      "en": "Aspect Ratio"
     }
    },
    {
     "name": "resolution",
     "type": "string",
     "required": true,
     "ui": "select",
     "role": "param",
     "enum": [
      "1K"
     ],
     "desc": "Resolution scale. One of: 1K.",
     "label": {
      "zh": "Resolution",
      "en": "Resolution"
     }
    }
   ],
   "roles": {
    "source": null,
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "bytedance/seedream-4": {
   "id": "bytedance/seedream-4",
   "kind": "image",
   "label": {
    "zh": "Seedream 4",
    "en": "Seedream 4"
   },
   "endpoint": "/generate/image/bytedance/seedream-4",
   "vendor": "bytedance",
   "summary": "Seedream 4",
   "desc": "New high quality model for photorealism and text rendering",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": true,
     "ui": "number",
     "role": "param",
     "max": 4096,
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": true,
     "ui": "number",
     "role": "param",
     "max": 4096,
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 1337,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "style_images",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "refs",
     "desc": "Image prompts to use for the generation",
     "itemType": "object",
     "itemProps": [
      "strength",
      "url"
     ],
     "wrap": "strength",
     "label": {
      "zh": "Style Images",
      "en": "Style Images"
     }
    }
   ],
   "roles": {
    "source": null,
    "refs": [
     "style_images"
    ],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "wrappedRefs": [
     "style_images"
    ],
    "hasStrength": false
   }
  },
  "bytedance/seedream-5-lite": {
   "id": "bytedance/seedream-5-lite",
   "kind": "image",
   "label": {
    "zh": "Seedream 5 Lite",
    "en": "Seedream 5 Lite"
   },
   "endpoint": "/generate/image/bytedance/seedream-5-lite",
   "vendor": "bytedance",
   "summary": "Seedream 5 Lite",
   "desc": "Medium quality model with reasoning and web search.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": true,
     "ui": "number",
     "role": "param",
     "max": 4096,
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": true,
     "ui": "number",
     "role": "param",
     "max": 4096,
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 1337,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "style_images",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "refs",
     "desc": "Image prompts to use for the generation",
     "itemType": "object",
     "itemProps": [
      "strength",
      "url"
     ],
     "wrap": "strength",
     "label": {
      "zh": "Style Images",
      "en": "Style Images"
     }
    }
   ],
   "roles": {
    "source": null,
    "refs": [
     "style_images"
    ],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "wrappedRefs": [
     "style_images"
    ],
    "hasStrength": false
   }
  },
  "bytedance/seedream-5-pro": {
   "id": "bytedance/seedream-5-pro",
   "kind": "image",
   "label": {
    "zh": "Seedream 5 Pro",
    "en": "Seedream 5 Pro"
   },
   "endpoint": "/generate/image/bytedance/seedream-5-pro",
   "vendor": "bytedance",
   "summary": "Seedream 5 Pro",
   "desc": "Highest quality model with precise editing control.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": true,
     "ui": "number",
     "role": "param",
     "max": 4096,
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": true,
     "ui": "number",
     "role": "param",
     "max": 4096,
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 1337,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "style_images",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "refs",
     "desc": "Image prompts to use for the generation",
     "itemType": "object",
     "itemProps": [
      "strength",
      "url"
     ],
     "wrap": "strength",
     "label": {
      "zh": "Style Images",
      "en": "Style Images"
     }
    }
   ],
   "roles": {
    "source": null,
    "refs": [
     "style_images"
    ],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "wrappedRefs": [
     "style_images"
    ],
    "hasStrength": false
   }
  },
  "qwen/2512": {
   "id": "qwen/2512",
   "kind": "image",
   "label": {
    "zh": "Qwen 2512",
    "en": "Qwen 2512"
   },
   "endpoint": "/generate/image/qwen/2512",
   "vendor": "qwen",
   "summary": "Qwen Image 2512",
   "desc": "Affordable medium quality model.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "negative_prompt",
     "type": "string",
     "required": false,
     "ui": "text",
     "role": "param",
     "default": "",
     "label": {
      "zh": "Negative Prompt",
      "en": "Negative Prompt"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1024,
     "min": 256,
     "max": 4096,
     "step": 1,
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1024,
     "min": 256,
     "max": 4096,
     "step": 1,
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "num_inference_steps",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 28,
     "min": 1,
     "max": 50,
     "step": 1,
     "label": {
      "zh": "Num Inference Steps",
      "en": "Num Inference Steps"
     }
    },
    {
     "name": "cfg_scale",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 4,
     "label": {
      "zh": "Cfg Scale",
      "en": "Cfg Scale"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 1337,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "styles",
     "type": "array",
     "required": false,
     "ui": "style_ids",
     "role": "param",
     "itemType": "object",
     "itemProps": [
      "id",
      "strength"
     ],
     "label": {
      "zh": "Styles",
      "en": "Styles"
     }
    }
   ],
   "roles": {
    "source": null,
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "z-image/z-image": {
   "id": "z-image/z-image",
   "kind": "image",
   "label": {
    "zh": "Z-Image（便宜快速）",
    "en": "Z-Image (cheap)"
   },
   "endpoint": "/generate/image/z-image/z-image",
   "vendor": "z-image",
   "summary": "Z Image",
   "desc": "Fastest model. Realistic, low diversity.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 1337,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "denoising_strength",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.6,
     "min": 0,
     "max": 1,
     "step": 0.01,
     "label": {
      "zh": "Denoising Strength",
      "en": "Denoising Strength"
     }
    },
    {
     "name": "styles",
     "type": "array",
     "required": false,
     "ui": "style_ids",
     "role": "param",
     "itemType": "object",
     "itemProps": [
      "id",
      "strength"
     ],
     "label": {
      "zh": "Styles",
      "en": "Styles"
     }
    },
    {
     "name": "skip_prompt_expansion",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "label": {
      "zh": "Skip Prompt Expansion",
      "en": "Skip Prompt Expansion"
     }
    },
    {
     "name": "aspect_ratio",
     "type": "string",
     "required": true,
     "ui": "select",
     "role": "param",
     "enum": [
      "1:1",
      "4:3",
      "2:3",
      "16:9",
      "9:16"
     ],
     "desc": "Aspect ratio. One of: 1:1, 4:3, 2:3, 16:9, 9:16.",
     "label": {
      "zh": "Aspect Ratio",
      "en": "Aspect Ratio"
     }
    },
    {
     "name": "resolution",
     "type": "string",
     "required": true,
     "ui": "select",
     "role": "param",
     "enum": [
      "1K"
     ],
     "desc": "Resolution scale. One of: 1K.",
     "label": {
      "zh": "Resolution",
      "en": "Resolution"
     }
    },
    {
     "name": "image_url",
     "type": "anyOf",
     "required": false,
     "ui": "image",
     "role": "source",
     "wrap": "single",
     "label": {
      "zh": "Image Url",
      "en": "Image Url"
     }
    },
    {
     "name": "style_images",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "refs",
     "desc": "Image prompts to use for the generation",
     "itemType": "object",
     "itemProps": [
      "strength",
      "url"
     ],
     "wrap": "strength",
     "label": {
      "zh": "Style Images",
      "en": "Style Images"
     }
    }
   ],
   "roles": {
    "source": "image_url",
    "refs": [
     "style_images"
    ],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "single",
    "wrappedRefs": [
     "style_images"
    ],
    "hasStrength": false
   }
  },
  "ideogram/ideogram-4.5-precise": {
   "id": "ideogram/ideogram-4.5-precise",
   "kind": "image",
   "label": {
    "zh": "Ideogram 4.5 Precise（带蒙版）",
    "en": "Ideogram 4.5 Precise"
   },
   "endpoint": "/generate/image/ideogram/ideogram-4.5-precise",
   "vendor": "ideogram",
   "summary": "Ideogram 4.5 Precise",
   "desc": "Precisely edit an image while preserving its resolution and surrounding details. Supports optional masks and reference images. Use generate_image with this model for both masked and unmasked edits.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "seed",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "min": 0,
     "max": 2147483647,
     "step": 1,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "quality",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "very_low",
      "low",
      "medium",
      "high"
     ],
     "default": "high",
     "label": {
      "zh": "Quality",
      "en": "Quality"
     }
    },
    {
     "name": "image_url",
     "type": "string",
     "required": true,
     "ui": "image",
     "role": "source",
     "desc": "Can be an external URL, base64 data URI, or uploaded asset URL.",
     "wrap": "single",
     "label": {
      "zh": "Image Url",
      "en": "Image Url"
     }
    },
    {
     "name": "mask_url",
     "type": "string",
     "required": false,
     "ui": "image",
     "role": "mask",
     "desc": "Optional mask matching the source dimensions: white selects the region to edit, black preserves it. Leave part of the image unselected.",
     "wrap": "single",
     "label": {
      "zh": "Mask Url",
      "en": "Mask Url"
     }
    },
    {
     "name": "reference_images",
     "type": "array",
     "required": false,
     "ui": "images",
     "role": "refs",
     "default": [],
     "desc": "Up to four reference images without a mask, or three when mask_url is supplied. The source image is passed separately as image_url.",
     "itemType": "string",
     "wrap": "plain",
     "label": {
      "zh": "Reference Images",
      "en": "Reference Images"
     }
    }
   ],
   "roles": {
    "source": "image_url",
    "refs": [
     "reference_images"
    ],
    "mask": "mask_url",
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "single",
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "bytedance/seededit": {
   "id": "bytedance/seededit",
   "kind": "image",
   "label": {
    "zh": "SeedEdit（局部编辑）",
    "en": "SeedEdit (edit)"
   },
   "endpoint": "/generate/image/bytedance/seededit",
   "vendor": "bytedance",
   "summary": "SeedEdit",
   "desc": "New frontier model designed for image editing",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": true,
     "ui": "textarea",
     "role": "prompt",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 1337,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "image_url",
     "type": "string",
     "required": true,
     "ui": "image",
     "role": "source",
     "desc": "Can be an external URL, base64 data URI, or uploaded asset URL.",
     "wrap": "single",
     "label": {
      "zh": "Image Url",
      "en": "Image Url"
     }
    }
   ],
   "roles": {
    "source": "image_url",
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "single",
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "krea/enhance": {
   "id": "krea/enhance",
   "kind": "enhance",
   "label": {
    "zh": "Krea Enhance（放大）",
    "en": "Krea Enhance"
   },
   "endpoint": "/generate/enhance/krea/enhance",
   "vendor": "krea",
   "summary": "Krea Enhance",
   "desc": "Cheap creative enhancer for adding new details. Max 8K.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": false,
     "ui": "textarea",
     "role": "prompt",
     "default": "",
     "desc": "Text prompt describing the desired result.",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "image_url",
     "type": "string",
     "required": true,
     "ui": "image",
     "role": "source",
     "desc": "Can be an external URL, base64 data URI, or uploaded asset URL.",
     "wrap": "single",
     "label": {
      "zh": "Image Url",
      "en": "Image Url"
     }
    },
    {
     "name": "image_scaling_factor",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 2,
     "min": 0.1,
     "desc": "Factor to scale the image resolution by (e.g. 2 means 2x; use 1 to skip upscaling).",
     "label": {
      "zh": "Image Scaling Factor",
      "en": "Image Scaling Factor"
     }
    },
    {
     "name": "rescale_color",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "desc": "Match the original image color palette.",
     "label": {
      "zh": "Rescale Color",
      "en": "Rescale Color"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "desc": "Seed for reproducible results.",
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "ai_strength",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.4,
     "min": 0.1,
     "max": 1,
     "desc": "AI strength — how much new detail the model generates. Higher values enhance more aggressively.",
     "step": 0.01,
     "label": {
      "zh": "Ai Strength",
      "en": "Ai Strength"
     }
    },
    {
     "name": "clarity_strength",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 4,
     "min": 1,
     "max": 12,
     "desc": "Clarity — how strongly the result follows the prompt.",
     "step": 0.1,
     "label": {
      "zh": "Clarity Strength",
      "en": "Clarity Strength"
     }
    },
    {
     "name": "resemblance_strength",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1,
     "min": 0,
     "max": 2.5,
     "desc": "Resemblance — how faithfully the result preserves the original image structure.",
     "step": 0.1,
     "label": {
      "zh": "Resemblance Strength",
      "en": "Resemblance Strength"
     }
    },
    {
     "name": "sharpness",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.5,
     "min": 0.1,
     "max": 1.5,
     "desc": "Sharpness applied to fine detail. Does not affect generation of new detail.",
     "step": 0.01,
     "label": {
      "zh": "Sharpness",
      "en": "Sharpness"
     }
    }
   ],
   "roles": {
    "source": "image_url",
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "single",
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "krea/legacy-enhance": {
   "id": "krea/legacy-enhance",
   "kind": "enhance",
   "label": {
    "zh": "Krea Enhance Legacy",
    "en": "Krea Enhance Legacy"
   },
   "endpoint": "/generate/enhance/krea/legacy-enhance",
   "vendor": "krea",
   "summary": "Krea Enhance Legacy",
   "desc": "Krea's generative legacy enhancer. Max 4K.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": false,
     "ui": "textarea",
     "role": "prompt",
     "default": "",
     "desc": "Text prompt describing the desired result.",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "image_url",
     "type": "string",
     "required": true,
     "ui": "image",
     "role": "source",
     "desc": "Can be an external URL, base64 data URI, or uploaded asset URL.",
     "wrap": "single",
     "label": {
      "zh": "Image Url",
      "en": "Image Url"
     }
    },
    {
     "name": "image_scaling_factor",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 2,
     "min": 0.1,
     "desc": "Factor to scale the image resolution by (e.g. 2 means 2x; use 1 to skip upscaling).",
     "label": {
      "zh": "Image Scaling Factor",
      "en": "Image Scaling Factor"
     }
    },
    {
     "name": "rescale_color",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "desc": "Match the original image color palette.",
     "label": {
      "zh": "Rescale Color",
      "en": "Rescale Color"
     }
    },
    {
     "name": "upscaling_activated",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": true,
     "desc": "Whether to upscale the image.",
     "label": {
      "zh": "Upscaling Activated",
      "en": "Upscaling Activated"
     }
    },
    {
     "name": "ai_strength",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.6,
     "min": 0.1,
     "max": 1,
     "desc": "AI strength — how much new detail the model generates. Higher values enhance more aggressively.",
     "step": 0.01,
     "label": {
      "zh": "Ai Strength",
      "en": "Ai Strength"
     }
    },
    {
     "name": "clarity_strength",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 2.5,
     "min": 1,
     "max": 12,
     "desc": "Clarity — how strongly the result follows the prompt.",
     "step": 0.1,
     "label": {
      "zh": "Clarity Strength",
      "en": "Clarity Strength"
     }
    },
    {
     "name": "resemblance_strength",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1,
     "min": 0,
     "max": 2.5,
     "desc": "Resemblance — how faithfully the result preserves the original image structure.",
     "step": 0.1,
     "label": {
      "zh": "Resemblance Strength",
      "en": "Resemblance Strength"
     }
    },
    {
     "name": "scene_transfer",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "desc": "Scene Transfer — relight the image using a reference scene.",
     "label": {
      "zh": "Scene Transfer",
      "en": "Scene Transfer"
     }
    },
    {
     "name": "scene_image_url",
     "type": "anyOf",
     "required": false,
     "ui": "image",
     "role": "scene",
     "default": "",
     "desc": "Reference scene image URL. Required when scene_transfer is true.",
     "wrap": "single",
     "label": {
      "zh": "Scene Image Url",
      "en": "Scene Image Url"
     }
    },
    {
     "name": "scene_prompt",
     "type": "string",
     "required": false,
     "ui": "text",
     "role": "param",
     "default": "",
     "desc": "Prompt describing the target scene and lighting.",
     "label": {
      "zh": "Scene Prompt",
      "en": "Scene Prompt"
     }
    },
    {
     "name": "scene_strength",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.85,
     "min": 0.5,
     "max": 1,
     "desc": "Scene Transfer strength.",
     "step": 0.01,
     "label": {
      "zh": "Scene Strength",
      "en": "Scene Strength"
     }
    },
    {
     "name": "switch_background",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "desc": "Replace the background with the reference scene.",
     "label": {
      "zh": "Switch Background",
      "en": "Switch Background"
     }
    }
   ],
   "roles": {
    "source": "image_url",
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": "scene_image_url",
    "sourceUrl": null,
    "sourceWrap": "single",
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "topaz/generative-enhance": {
   "id": "topaz/generative-enhance",
   "kind": "enhance",
   "label": {
    "zh": "Topaz 生成式放大",
    "en": "Topaz Generative"
   },
   "endpoint": "/generate/enhance/topaz/generative-enhance",
   "vendor": "topaz",
   "summary": "Topaz Image Upscale",
   "desc": "Most powerful creative enhancer. Max 16K.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": false,
     "ui": "textarea",
     "role": "prompt",
     "default": "",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": true,
     "ui": "slider",
     "role": "param",
     "min": 1,
     "max": 32000,
     "step": 1,
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": true,
     "ui": "slider",
     "role": "param",
     "min": 1,
     "max": 32000,
     "step": 1,
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 1337,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "image_url",
     "type": "string",
     "required": true,
     "ui": "image",
     "role": "source",
     "desc": "Can be an external URL, base64 data URI, or uploaded asset URL.",
     "wrap": "single",
     "label": {
      "zh": "Image Url",
      "en": "Image Url"
     }
    },
    {
     "name": "model",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "Redefine",
      "Recovery",
      "Recovery V2",
      "Reimagine",
      "Wonder 3",
      "Standard MAX",
      "Recover 3",
      "Detail"
     ],
     "default": "Redefine",
     "label": {
      "zh": "Model",
      "en": "Model"
     }
    },
    {
     "name": "output_format",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "png",
      "jpg",
      "webp"
     ],
     "default": "jpg",
     "label": {
      "zh": "Output Format",
      "en": "Output Format"
     }
    },
    {
     "name": "subject_detection",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "All",
      "Foreground",
      "Background"
     ],
     "default": "All",
     "label": {
      "zh": "Subject Detection",
      "en": "Subject Detection"
     }
    },
    {
     "name": "face_enhancement",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "label": {
      "zh": "Face Enhancement",
      "en": "Face Enhancement"
     }
    },
    {
     "name": "face_enhancement_creativity",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.5,
     "min": 0,
     "max": 1,
     "step": 0.01,
     "label": {
      "zh": "Face Enhancement Creativity",
      "en": "Face Enhancement Creativity"
     }
    },
    {
     "name": "face_enhancement_strength",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.5,
     "min": 0,
     "max": 1,
     "step": 0.01,
     "label": {
      "zh": "Face Enhancement Strength",
      "en": "Face Enhancement Strength"
     }
    },
    {
     "name": "crop_to_fill",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "label": {
      "zh": "Crop To Fill",
      "en": "Crop To Fill"
     }
    },
    {
     "name": "upscaling_activated",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "label": {
      "zh": "Upscaling Activated",
      "en": "Upscaling Activated"
     }
    },
    {
     "name": "image_scaling_factor",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1,
     "min": 1,
     "max": 32,
     "step": 1,
     "label": {
      "zh": "Image Scaling Factor",
      "en": "Image Scaling Factor"
     }
    },
    {
     "name": "creativity",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 3,
     "min": 1,
     "max": 6,
     "step": 1,
     "label": {
      "zh": "Creativity",
      "en": "Creativity"
     }
    },
    {
     "name": "texture",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 3,
     "min": 1,
     "max": 5,
     "step": 1,
     "label": {
      "zh": "Texture",
      "en": "Texture"
     }
    },
    {
     "name": "sharpen",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.5,
     "min": 0,
     "max": 1,
     "step": 0.01,
     "label": {
      "zh": "Sharpen",
      "en": "Sharpen"
     }
    },
    {
     "name": "denoise",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.5,
     "min": 0,
     "max": 1,
     "step": 0.01,
     "label": {
      "zh": "Denoise",
      "en": "Denoise"
     }
    },
    {
     "name": "detail",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.5,
     "min": 0,
     "max": 1,
     "step": 0.01,
     "label": {
      "zh": "Detail",
      "en": "Detail"
     }
    }
   ],
   "roles": {
    "source": "image_url",
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "single",
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "topaz/standard-enhance": {
   "id": "topaz/standard-enhance",
   "kind": "enhance",
   "label": {
    "zh": "Topaz Standard",
    "en": "Topaz Standard"
   },
   "endpoint": "/generate/enhance/topaz/standard-enhance",
   "vendor": "topaz",
   "summary": "Topaz Standard",
   "desc": "Powerful faithful upscaler. Up to 22K resolution. Best for photos.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": false,
     "ui": "textarea",
     "role": "prompt",
     "default": "",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": true,
     "ui": "slider",
     "role": "param",
     "min": 1,
     "max": 32000,
     "step": 1,
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": true,
     "ui": "slider",
     "role": "param",
     "min": 1,
     "max": 32000,
     "step": 1,
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 1337,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "image_url",
     "type": "string",
     "required": true,
     "ui": "image",
     "role": "source",
     "desc": "Can be an external URL, base64 data URI, or uploaded asset URL.",
     "wrap": "single",
     "label": {
      "zh": "Image Url",
      "en": "Image Url"
     }
    },
    {
     "name": "model",
     "type": "string",
     "required": true,
     "ui": "select",
     "role": "param",
     "enum": [
      "Standard V2",
      "Low Resolution V2",
      "CGI",
      "High Fidelity V2",
      "Upscale High Fidelity V3",
      "Text Refine"
     ],
     "label": {
      "zh": "Model",
      "en": "Model"
     }
    },
    {
     "name": "output_format",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "png",
      "jpg",
      "webp"
     ],
     "default": "jpg",
     "label": {
      "zh": "Output Format",
      "en": "Output Format"
     }
    },
    {
     "name": "subject_detection",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "All",
      "Foreground",
      "Background"
     ],
     "default": "All",
     "label": {
      "zh": "Subject Detection",
      "en": "Subject Detection"
     }
    },
    {
     "name": "face_enhancement",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "label": {
      "zh": "Face Enhancement",
      "en": "Face Enhancement"
     }
    },
    {
     "name": "face_enhancement_creativity",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.5,
     "min": 0,
     "max": 1,
     "step": 0.01,
     "label": {
      "zh": "Face Enhancement Creativity",
      "en": "Face Enhancement Creativity"
     }
    },
    {
     "name": "face_enhancement_strength",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.5,
     "min": 0,
     "max": 1,
     "step": 0.01,
     "label": {
      "zh": "Face Enhancement Strength",
      "en": "Face Enhancement Strength"
     }
    },
    {
     "name": "crop_to_fill",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "label": {
      "zh": "Crop To Fill",
      "en": "Crop To Fill"
     }
    },
    {
     "name": "upscaling_activated",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "label": {
      "zh": "Upscaling Activated",
      "en": "Upscaling Activated"
     }
    },
    {
     "name": "image_scaling_factor",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1,
     "min": 1,
     "max": 32,
     "step": 1,
     "label": {
      "zh": "Image Scaling Factor",
      "en": "Image Scaling Factor"
     }
    },
    {
     "name": "sharpen",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.5,
     "min": 0,
     "max": 1,
     "step": 0.01,
     "label": {
      "zh": "Sharpen",
      "en": "Sharpen"
     }
    },
    {
     "name": "denoise",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.5,
     "min": 0,
     "max": 1,
     "step": 0.01,
     "label": {
      "zh": "Denoise",
      "en": "Denoise"
     }
    },
    {
     "name": "fix_compression",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.5,
     "min": 0,
     "max": 1,
     "step": 0.01,
     "label": {
      "zh": "Fix Compression",
      "en": "Fix Compression"
     }
    },
    {
     "name": "strength",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.5,
     "min": 0.01,
     "max": 1,
     "step": 0.01,
     "label": {
      "zh": "Strength",
      "en": "Strength"
     }
    }
   ],
   "roles": {
    "source": "image_url",
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "single",
    "wrappedRefs": [],
    "hasStrength": true
   }
  },
  "topaz/bloom-enhance": {
   "id": "topaz/bloom-enhance",
   "kind": "enhance",
   "label": {
    "zh": "Topaz Bloom",
    "en": "Topaz Bloom"
   },
   "endpoint": "/generate/enhance/topaz/bloom-enhance",
   "vendor": "topaz",
   "summary": "Topaz Bloom",
   "desc": "Creative upscaler that adds new details. Max 10K.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": false,
     "ui": "textarea",
     "role": "prompt",
     "default": "",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": true,
     "ui": "slider",
     "role": "param",
     "min": 1,
     "max": 10000,
     "step": 1,
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": true,
     "ui": "slider",
     "role": "param",
     "min": 1,
     "max": 10000,
     "step": 1,
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 1337,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "image_url",
     "type": "string",
     "required": true,
     "ui": "image",
     "role": "source",
     "desc": "Can be an external URL, base64 data URI, or uploaded asset URL.",
     "wrap": "single",
     "label": {
      "zh": "Image Url",
      "en": "Image Url"
     }
    },
    {
     "name": "output_format",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "png",
      "jpg",
      "webp"
     ],
     "default": "jpg",
     "label": {
      "zh": "Output Format",
      "en": "Output Format"
     }
    },
    {
     "name": "crop_to_fill",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "label": {
      "zh": "Crop To Fill",
      "en": "Crop To Fill"
     }
    },
    {
     "name": "creativity",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 3,
     "min": 1,
     "max": 9,
     "step": 1,
     "label": {
      "zh": "Creativity",
      "en": "Creativity"
     }
    },
    {
     "name": "face_preservation",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "label": {
      "zh": "Face Preservation",
      "en": "Face Preservation"
     }
    },
    {
     "name": "color_preservation",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "label": {
      "zh": "Color Preservation",
      "en": "Color Preservation"
     }
    },
    {
     "name": "upscaling_activated",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "label": {
      "zh": "Upscaling Activated",
      "en": "Upscaling Activated"
     }
    },
    {
     "name": "image_scaling_factor",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1,
     "min": 1,
     "max": 32,
     "step": 1,
     "label": {
      "zh": "Image Scaling Factor",
      "en": "Image Scaling Factor"
     }
    }
   ],
   "roles": {
    "source": "image_url",
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "single",
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "topaz/bloom-2-enhance": {
   "id": "topaz/bloom-2-enhance",
   "kind": "enhance",
   "label": {
    "zh": "Topaz Bloom 2",
    "en": "Topaz Bloom 2"
   },
   "endpoint": "/generate/enhance/topaz/bloom-2-enhance",
   "vendor": "topaz",
   "summary": "Topaz Bloom 2",
   "desc": "Creative upscaler for GenAI images, reimagined. Max 10K.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": false,
     "ui": "textarea",
     "role": "prompt",
     "default": "",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": true,
     "ui": "slider",
     "role": "param",
     "min": 1,
     "max": 10000,
     "step": 1,
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": true,
     "ui": "slider",
     "role": "param",
     "min": 1,
     "max": 10000,
     "step": 1,
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 1337,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "image_url",
     "type": "string",
     "required": true,
     "ui": "image",
     "role": "source",
     "desc": "Can be an external URL, base64 data URI, or uploaded asset URL.",
     "wrap": "single",
     "label": {
      "zh": "Image Url",
      "en": "Image Url"
     }
    },
    {
     "name": "output_format",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "png",
      "jpg",
      "webp"
     ],
     "default": "jpg",
     "label": {
      "zh": "Output Format",
      "en": "Output Format"
     }
    },
    {
     "name": "crop_to_fill",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "label": {
      "zh": "Crop To Fill",
      "en": "Crop To Fill"
     }
    },
    {
     "name": "creativity",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 3,
     "min": 1,
     "max": 9,
     "step": 1,
     "label": {
      "zh": "Creativity",
      "en": "Creativity"
     }
    },
    {
     "name": "autoprompt",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": true,
     "label": {
      "zh": "Autoprompt",
      "en": "Autoprompt"
     }
    },
    {
     "name": "face_preservation",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "label": {
      "zh": "Face Preservation",
      "en": "Face Preservation"
     }
    },
    {
     "name": "color_preservation",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": true,
     "label": {
      "zh": "Color Preservation",
      "en": "Color Preservation"
     }
    },
    {
     "name": "grain",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "label": {
      "zh": "Grain",
      "en": "Grain"
     }
    },
    {
     "name": "grain_model",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "silver",
      "gaussian",
      "grey"
     ],
     "default": "silver",
     "label": {
      "zh": "Grain Model",
      "en": "Grain Model"
     }
    },
    {
     "name": "grain_density",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.5,
     "min": 0,
     "max": 1,
     "step": 0.01,
     "label": {
      "zh": "Grain Density",
      "en": "Grain Density"
     }
    },
    {
     "name": "grain_strength",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.5,
     "min": 0,
     "max": 1,
     "step": 0.01,
     "label": {
      "zh": "Grain Strength",
      "en": "Grain Strength"
     }
    },
    {
     "name": "grain_size",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1,
     "min": 1,
     "max": 5,
     "step": 0.1,
     "label": {
      "zh": "Grain Size",
      "en": "Grain Size"
     }
    },
    {
     "name": "reference_uri",
     "type": "string",
     "required": false,
     "ui": "text",
     "role": "param",
     "desc": "Can be an external URL, base64 data URI, or uploaded asset URL.",
     "label": {
      "zh": "Reference Uri",
      "en": "Reference Uri"
     }
    },
    {
     "name": "upscaling_activated",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "label": {
      "zh": "Upscaling Activated",
      "en": "Upscaling Activated"
     }
    },
    {
     "name": "image_scaling_factor",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1,
     "min": 1,
     "max": 32,
     "step": 1,
     "label": {
      "zh": "Image Scaling Factor",
      "en": "Image Scaling Factor"
     }
    }
   ],
   "roles": {
    "source": "image_url",
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "single",
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "topaz/wonder-35-enhance": {
   "id": "topaz/wonder-35-enhance",
   "kind": "enhance",
   "label": {
    "zh": "Topaz Wonder 3.5",
    "en": "Topaz Wonder 3.5"
   },
   "endpoint": "/generate/enhance/topaz/wonder-35-enhance",
   "vendor": "topaz",
   "summary": "Topaz Wonder 3.5",
   "desc": "Detail-faithful generative upscaler. Max 16K.",
   "fields": [
    {
     "name": "width",
     "type": "number",
     "required": true,
     "ui": "slider",
     "role": "param",
     "min": 1,
     "max": 16000,
     "step": 1,
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": true,
     "ui": "slider",
     "role": "param",
     "min": 1,
     "max": 16000,
     "step": 1,
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 1337,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "image_url",
     "type": "string",
     "required": true,
     "ui": "image",
     "role": "source",
     "desc": "Can be an external URL, base64 data URI, or uploaded asset URL.",
     "wrap": "single",
     "label": {
      "zh": "Image Url",
      "en": "Image Url"
     }
    },
    {
     "name": "output_format",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "png",
      "jpg",
      "webp"
     ],
     "default": "jpg",
     "label": {
      "zh": "Output Format",
      "en": "Output Format"
     }
    },
    {
     "name": "crop_to_fill",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "label": {
      "zh": "Crop To Fill",
      "en": "Crop To Fill"
     }
    },
    {
     "name": "enhancement_strength",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "low",
      "medium",
      "high"
     ],
     "default": "high",
     "label": {
      "zh": "Enhancement Strength",
      "en": "Enhancement Strength"
     }
    },
    {
     "name": "grain",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "label": {
      "zh": "Grain",
      "en": "Grain"
     }
    },
    {
     "name": "grain_model",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "silver",
      "gaussian",
      "grey"
     ],
     "default": "silver",
     "label": {
      "zh": "Grain Model",
      "en": "Grain Model"
     }
    },
    {
     "name": "grain_density",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.5,
     "min": 0,
     "max": 1,
     "step": 0.01,
     "label": {
      "zh": "Grain Density",
      "en": "Grain Density"
     }
    },
    {
     "name": "grain_strength",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0.5,
     "min": 0,
     "max": 1,
     "step": 0.01,
     "label": {
      "zh": "Grain Strength",
      "en": "Grain Strength"
     }
    },
    {
     "name": "grain_size",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1,
     "min": 1,
     "max": 5,
     "step": 0.1,
     "label": {
      "zh": "Grain Size",
      "en": "Grain Size"
     }
    },
    {
     "name": "upscaling_activated",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": false,
     "label": {
      "zh": "Upscaling Activated",
      "en": "Upscaling Activated"
     }
    },
    {
     "name": "image_scaling_factor",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 1,
     "min": 1,
     "max": 32,
     "step": 1,
     "label": {
      "zh": "Image Scaling Factor",
      "en": "Image Scaling Factor"
     }
    }
   ],
   "roles": {
    "source": "image_url",
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "single",
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "magnific/creative-enhance": {
   "id": "magnific/creative-enhance",
   "kind": "enhance",
   "label": {
    "zh": "Magnific Creative",
    "en": "Magnific Creative"
   },
   "endpoint": "/generate/enhance/magnific/creative-enhance",
   "vendor": "magnific",
   "summary": "Magnific Creative",
   "desc": "Best creative enhancer. Max 10K.",
   "fields": [
    {
     "name": "prompt",
     "type": "string",
     "required": false,
     "ui": "textarea",
     "role": "prompt",
     "default": "",
     "label": {
      "zh": "Prompt",
      "en": "Prompt"
     }
    },
    {
     "name": "width",
     "type": "number",
     "required": true,
     "ui": "slider",
     "role": "param",
     "min": 1,
     "max": 10000,
     "step": 1,
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": true,
     "ui": "slider",
     "role": "param",
     "min": 1,
     "max": 10000,
     "step": 1,
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 1337,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "image_url",
     "type": "string",
     "required": true,
     "ui": "image",
     "role": "source",
     "desc": "Can be an external URL, base64 data URI, or uploaded asset URL.",
     "wrap": "single",
     "label": {
      "zh": "Image Url",
      "en": "Image Url"
     }
    },
    {
     "name": "output_format",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "png",
      "jpg",
      "webp"
     ],
     "default": "png",
     "label": {
      "zh": "Output Format",
      "en": "Output Format"
     }
    },
    {
     "name": "optimized_for",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "standard",
      "soft_portraits",
      "hard_portraits",
      "art_n_illustration",
      "videogame_assets",
      "nature_n_landscapes",
      "films_n_photography",
      "3d_renders",
      "science_fiction_n_horror"
     ],
     "default": "standard",
     "label": {
      "zh": "Optimized For",
      "en": "Optimized For"
     }
    },
    {
     "name": "creativity",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0,
     "min": -10,
     "max": 10,
     "step": 1,
     "label": {
      "zh": "Creativity",
      "en": "Creativity"
     }
    },
    {
     "name": "hdr",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0,
     "min": -10,
     "max": 10,
     "step": 1,
     "label": {
      "zh": "Hdr",
      "en": "Hdr"
     }
    },
    {
     "name": "resemblance",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0,
     "min": -10,
     "max": 10,
     "step": 1,
     "label": {
      "zh": "Resemblance",
      "en": "Resemblance"
     }
    },
    {
     "name": "fractality",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 0,
     "min": -10,
     "max": 10,
     "step": 1,
     "label": {
      "zh": "Fractality",
      "en": "Fractality"
     }
    },
    {
     "name": "engine",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "automatic",
      "magnific_illusio",
      "magnific_sharpy",
      "magnific_sparkle"
     ],
     "default": "automatic",
     "label": {
      "zh": "Engine",
      "en": "Engine"
     }
    },
    {
     "name": "upscaling_activated",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": true,
     "label": {
      "zh": "Upscaling Activated",
      "en": "Upscaling Activated"
     }
    },
    {
     "name": "image_scaling_factor",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 2,
     "min": 2,
     "max": 16,
     "step": 0.1,
     "label": {
      "zh": "Image Scaling Factor",
      "en": "Image Scaling Factor"
     }
    }
   ],
   "roles": {
    "source": "image_url",
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "single",
    "wrappedRefs": [],
    "hasStrength": false
   }
  },
  "magnific/precise-enhance": {
   "id": "magnific/precise-enhance",
   "kind": "enhance",
   "label": {
    "zh": "Magnific Precise",
    "en": "Magnific Precise"
   },
   "endpoint": "/generate/enhance/magnific/precise-enhance",
   "vendor": "magnific",
   "summary": "Magnific Precise",
   "desc": "More faithful variant of Magnific. Max 10K.",
   "fields": [
    {
     "name": "width",
     "type": "number",
     "required": true,
     "ui": "slider",
     "role": "param",
     "min": 1,
     "max": 10000,
     "step": 1,
     "label": {
      "zh": "Width",
      "en": "Width"
     }
    },
    {
     "name": "height",
     "type": "number",
     "required": true,
     "ui": "slider",
     "role": "param",
     "min": 1,
     "max": 10000,
     "step": 1,
     "label": {
      "zh": "Height",
      "en": "Height"
     }
    },
    {
     "name": "seed",
     "type": "number",
     "required": false,
     "ui": "number",
     "role": "param",
     "default": 1337,
     "label": {
      "zh": "Seed",
      "en": "Seed"
     }
    },
    {
     "name": "image_url",
     "type": "string",
     "required": true,
     "ui": "image",
     "role": "source",
     "desc": "Can be an external URL, base64 data URI, or uploaded asset URL.",
     "wrap": "single",
     "label": {
      "zh": "Image Url",
      "en": "Image Url"
     }
    },
    {
     "name": "output_format",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "png",
      "jpg",
      "webp"
     ],
     "default": "png",
     "label": {
      "zh": "Output Format",
      "en": "Output Format"
     }
    },
    {
     "name": "sharpen",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 7,
     "min": 0,
     "max": 100,
     "step": 1,
     "label": {
      "zh": "Sharpen",
      "en": "Sharpen"
     }
    },
    {
     "name": "smart_grain",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 7,
     "min": 0,
     "max": 100,
     "step": 1,
     "label": {
      "zh": "Smart Grain",
      "en": "Smart Grain"
     }
    },
    {
     "name": "ultra_detail",
     "type": "integer",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 30,
     "min": 0,
     "max": 100,
     "step": 1,
     "label": {
      "zh": "Ultra Detail",
      "en": "Ultra Detail"
     }
    },
    {
     "name": "flavor",
     "type": "string",
     "required": false,
     "ui": "select",
     "role": "param",
     "enum": [
      "sublime",
      "photo",
      "photo_denoiser"
     ],
     "label": {
      "zh": "Flavor",
      "en": "Flavor"
     }
    },
    {
     "name": "upscaling_activated",
     "type": "boolean",
     "required": false,
     "ui": "boolean",
     "role": "param",
     "default": true,
     "label": {
      "zh": "Upscaling Activated",
      "en": "Upscaling Activated"
     }
    },
    {
     "name": "image_scaling_factor",
     "type": "number",
     "required": false,
     "ui": "slider",
     "role": "param",
     "default": 2,
     "min": 2,
     "max": 16,
     "step": 0.1,
     "label": {
      "zh": "Image Scaling Factor",
      "en": "Image Scaling Factor"
     }
    }
   ],
   "roles": {
    "source": "image_url",
    "refs": [],
    "mask": null,
    "prompt": "prompt",
    "scene": null,
    "sourceUrl": null,
    "sourceWrap": "single",
    "wrappedRefs": [],
    "hasStrength": false
   }
  }
 }
};
