class CanvasAPI {
  static instances = [];

  constructor(canvas_element) {
    CanvasAPI.instances.push(this);
    this.canvas = canvas_element;
    this.ctx = this.canvas.getContext("2d");
    this.color = "#FFFFFF";
    this.keys = {};

    this.vsize = new Proxy(
      {
        w: 256,
        h: 240,
        scale: 1,
      },
      handler
    );

    this.size = {
      w: this.canvas.clientHeight * devicePixelRatio,
      h: this.canvas.clientHeight * devicePixelRatio,
      scale: 1,
    };

    this.objects = [];

    resizeObserver.observe(this.canvas);
    this.initkeys(this);
  }

  render(array) {
    this.ctx.fillStyle = this.color;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!Array.isArray(array)) {
      array = [array];
    }
    array.forEach((obj) => {
      obj.render();
    });
  }

  static updSize() {
    console.log(`Updating size`);
    CanvasAPI.instances.forEach((instance) => {
      let temp = instance.ctx.getImageData(
        0,
        0,
        instance.canvas.width,
        instance.canvas.height
      );
      instance.canvas.width = instance.canvas.clientWidth * devicePixelRatio;
      instance.canvas.height = instance.canvas.clientHeight * devicePixelRatio;
      instance.size.w = instance.canvas.width;
      instance.size.h = instance.canvas.height;
      instance.size.scale =
        (instance.size.h / instance.vsize.h) * instance.vsize.scale;
      instance.ctx.putImageData(temp, 0, 0);
      instance.objects.forEach((obj) => {
        if (obj._type == "img") {
          obj.updImage(obj);
        }
      });
    });
  }

  initkeys(canvas) {
    addEventListener("keydown", (event) => {
      canvas.keys[event.code] = true;
    });
    addEventListener("keyup", (event) => {
      canvas.keys[event.code] = false;
    });
    addEventListener("mousedown", () => {
      canvas.keys["Mouse"] = true;
    });
    addEventListener("mouseup", () => {
      canvas.keys["Mouse"] = false;
    });
    addEventListener("touchstart", () => {
      canvas.keys["Touch"] = true;
    });
    addEventListener("touchend", () => {
      canvas.keys["Touch"] = false;
    });
  
  }

  static async loadAssets(assetPaths, callback) {
    const assetObjects = {};
    let assetsLoaded = 0;
    const totalAssets = assetPaths.length;
    document.body.style.pointerEvents = "none";

    function getFileType(path) {
      const ext = path.split(".").pop().toLowerCase();

      if (["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(ext)) {
        return "image";
      } else if (["mp3", "wav", "ogg", "flac"].includes(ext)) {
        return "audio";
      } else if (["txt"].includes(ext)) {
        return "text";
      } else if (["json"].includes(ext)) {
        return "json";
      } else {
        return null;
      }
    }

    function loadAsset(path) {
      const type = getFileType(path);

      if (type === "image") {
        const img = new Image();
        img.src = path;

        img.onload = function () {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          assetObjects[path] = canvas;
          updateProgress();
        };

        img.onerror = function () {
          console.error("Errore nel caricare l'immagine:", path);
          updateProgress();
        };
      } else if (type === "audio") {
        const audio = new Audio();
        audio.src = path;

        audio.onload = function () {
          assetObjects[path] = audio;
          updateProgress();
        };

        audio.onerror = function () {
          console.error("Errore nel caricare l'audio:", path);
          updateProgress();
        };
      } else if (type === "text") {
        fetch(path)
          .then((response) => response.text())
          .then((data) => {
            assetObjects[path] = data;
            updateProgress();
          })
          .catch(() => {
            console.error("Errore nel caricare il file di testo:", path);
            updateProgress();
          });
      } else if (type === "json") {
        fetch(path)
          .then((response) => response.json())
          .then((data) => {
            assetObjects[path] = data;
            updateProgress();
          })
          .catch(() => {
            console.error("Errore nel caricare il file JSON:", path);
            updateProgress();
          });
      } else {
        console.warn("Tipo di file non supportato:", path);
        updateProgress();
      }
    }

    function updateProgress() {
      assetsLoaded++;

      const percentage = Math.floor((assetsLoaded / totalAssets) * 100);
      window.loadeddata = percentage;

      if (assetsLoaded === totalAssets) {
        document.body.style.pointerEvents = "auto";
        if (typeof callback === "function") {
          callback(assetObjects);
        }
      }
    }

    assetPaths.forEach((path) => {
      loadAsset(path);
    });
  }
}

class Object {
  constructor(canvas_api) {
    this.setsize = {
      w: false,
      h: false,
      s: false,
    };
    this.api = canvas_api;
    this.api.objects.push(this);

    this.offset = {
      x: 0,
      y: 0,
    };

    this._type = "rect";
    this.frame = 0;
    this._imgdata = null;
    this._clcimgdata = null;
    this.color = "#000000";
    this._width = 16;
    this._height = 16;
    this._scale = 1;

    this.pos = {
      x: 0,
      y: 0,
      rot: 0,
    };

    this.show = true;
    this.opacity = 1;
    this._origin = "top-left";
    this.origin = this._origin;
  }

  set origin(value) {
    this._origin = value;
    this.updOrigin(this);
  }

  set width(value) {
    this._width = value;
    this.updOrigin(this);
  }

  set height(value) {
    this._height = value;
    this.updOrigin(this);
  }

  set scale(value) {
    this._scale = value;
    this.updOrigin(this);
  }

  set type(value) {
    this._type = value;
  }

  set imgdata(value) {
    this._imgdata = value;
    this.updImage(this);
  }

  updOrigin(obj) {
    const targetOG = obj._origin;

    switch (targetOG) {
      case "top-left":
        obj.offset.x = 0;
        obj.offset.y = 0;
        break;
      case "top-center":
        obj.offset.x = obj._width / 2;
        obj.offset.y = 0;
        break;
      case "top-right":
        obj.offset.x = obj._width;
        obj.offset.y = 0;
        break;
      case "center-left":
        obj.offset.x = 0;
        obj.offset.y = obj._height / 2;
        break;
      case "center":
        obj.offset.x = obj._width / 2;
        obj.offset.y = obj._height / 2;
        break;
      case "center-right":
        obj.offset.x = obj._width;
        obj.offset.y = obj._height / 2;
        break;
      case "bottom-left":
        obj.offset.x = 0;
        obj.offset.y = obj._height;
        break;
      case "bottom-center":
        obj.offset.x = obj._width / 2;
        obj.offset.y = obj._height;
        break;
      case "bottom-right":
        obj.offset.x = obj._width;
        obj.offset.y = obj._height;
        break;
      default:
        obj.offset.x = 0;
        obj.offset.y = 0;
        break;
    }
  }

  updImage(obj) {
    obj._clcimgdata = resizeImageData(
      obj._imgdata,
      obj._scale * obj.api.size.scale
    );
  }

  render() {
    if (this.show) {
      switch (this._type) {
        case "rect":
          this.api.ctx.fillStyle = this.color;
          this.api.ctx.globalAlpha = this.opacity;
          this.api.ctx.translate(
            this.pos.x * this.api.size.scale,
            this.pos.y * this.api.size.scale
          );
          this.api.ctx.rotate((this.pos.rot * Math.PI) / 180);
          this.api.ctx.fillRect(
            -this.offset.x * this.api.size.scale,
            -this.offset.y * this.api.size.scale,
            this._width * this.api.size.scale,
            this._height * this.api.size.scale
          );
          this.api.ctx.rotate(-(this.pos.rot * Math.PI) / 180);
          this.api.ctx.translate(
            -this.pos.x * this.api.size.scale,
            -this.pos.y * this.api.size.scale
          );
          this.api.ctx.globalAlpha = 1;
          break;
        case "img":
          if (this._imgdata) {
            if (this._clcimgdata == null) {
              this.updImage(this);
            }
            this.api.ctx.globalAlpha = this.opacity;
            this.api.ctx.translate(
              this.pos.x * this.api.size.scale,
              this.pos.y * this.api.size.scale
            );
            this.api.ctx.rotate((this.pos.rot * Math.PI) / 180);

            const canvas = this._clcimgdata[this.frame];
            this.api.ctx.drawImage(
              canvas,
              -this.offset.x * this.api.size.scale,
              -this.offset.y * this.api.size.scale
            );

            this.api.ctx.rotate(-(this.pos.rot * Math.PI) / 180);
            this.api.ctx.translate(
              -this.pos.x * this.api.size.scale,
              -this.pos.y * this.api.size.scale
            );
            this.api.ctx.globalAlpha = 1;
          }
          break;
      }
    }
  }
}

window.CanvasAPI = CanvasAPI;

window.canResize = true;

window.handler = {
  set(target, prop, value) {
    target[prop] = value;
    CanvasAPI.updSize();
    return true;
  },
};

window.resizeObserver = new ResizeObserver((element) => {
  if (canResize) {
    canResize = false;
    CanvasAPI.updSize();
    canResize = true;
    console.log(`Resized`);
  }
});

window.resizeImageData = function (canvases, scale) {
  if (!Array.isArray(canvases)) {
    canvases = [canvases];
  }

  return canvases.map(function (canvas) {
    const width = Math.floor(canvas.width * scale);
    const height = Math.floor(canvas.height * scale);

    const newCanvas = document.createElement("canvas");
    newCanvas.width = width;
    newCanvas.height = height;
    const ctx = newCanvas.getContext("2d");

    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(canvas, 0, 0, width, height);

    return newCanvas;
  });
};
