
let LANGUAGES = {
  Arabic: "ara",
  "Chinese - Simplified": "chi_sim",
  "Chinese - Traditional": "chi_tra",
  German: "deu",
  English: "eng",
  French: "fra",
  Hindi: "hin",
  Japanese: "jpn",
  Korean: "kor",
  Portuguese: "por",
  Russian: "rus",
};

const OPTIONS = {
  formatOutput: true,
  showUploadButton: true,
  showLanguageButton: true,
  enableDirectPasting: true,
  enableDragAndDrop: true,
  useThirdPartyOCR: false,
  theme: "default-mode",
  showInitialLoadingMessage: true,
};

const CONSTANTS = {
  workerLanguage: ["eng"],
	scriptId: "image-to-text-content-script",
	scriptIdCV: "opencv-content-script",
};

const CONFIG = {
  debug: true
}

let initializingPromise = null;
let initializingCVPromise = null;
let worker = null;

initialize();
// initializeCV();

addEventListener("mousedown", async (event) => {
  console.log("Mouse Clicked ", event);

  console.log("CV",cv);

  let date = new Date();

  let body = document.body;
  let pos_x = event.pageX;
  let pos_y = event.pageY;

  html2canvas(document.body).then(async function (canvas) {
    
    let data = {};
    let image = canvas.toDataURL("image/jpeg");

    await (async () => {
      data = await worker.recognize(image);
      // await worker.terminate();
    })();


    const ctx = canvas.getContext("2d");


    
    ctx.beginPath();
    ctx.arc(pos_x, pos_y, 10, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = "black";
    ctx.fill();


    

    console.log(data.data.text);

    chrome.runtime.sendMessage(
      {
        image: image,
        filename: `behavidence/${pos_x}_${pos_y}_${date.getTime()}_test.png`,
      },
      (response) => {
        console.log("received user data ", response);
      }
    );

    
  });

});

function onOpenCvLoaded() {

  log("OpenCV Loaded");
  // OpenCV.js is loaded, you can use it here
  cv.onRuntimeInitialized = function () {
    // OpenCV.js is ready to use
    // You can use OpenCV functions here
    // For example:
    const src = new cv.Mat(256, 256, cv.CV_8UC4);
    const dst = new cv.Mat();
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
  };
}

function saveAs(uri, filename) {
  var link = document.createElement("a");

  if (typeof link.download === "string") {
    link.href = uri;
    link.download = filename;

    //Firefox requires the link to be in the body
    document.body.appendChild(link);

    //simulate click
    link.click();

    //remove the link when done
    document.body.removeChild(link);
  } else {
    window.open(uri);
  }
}

// async function initializeCV() {
//   if (initializingCVPromise) {
//     return initializingCVPromise;
//   }

//   initializingCVPromise = new Promise(async (resolve, reject) => {
//     if (document.getElementById(CONSTANTS.scriptIdCV)) {
//       log("Already loaded script");
//       resolve();
//     } else {
//       const script = document.createElement("script");
//       script.id = CONSTANTS.scriptIdCV;
//       script.src = chrome.runtime.getURL("./opencv/opencv.js");
//       script.type = "text/javascript";
//       script.onload = async function () {
//         log("Loaded OpenCV Script");
//         log(script.src);
//         onOpenCvLoaded();
//         resolve();
//       };
//       (document.head || document.documentElement).appendChild(script);

      
//     }
//   }).finally(() => {
    
//   });
//   return initializingCVPromise;
// }

async function initialize() {
  if (initializingPromise) {
    // If initialization is already in progress, return the promise
    return initializingPromise;
  }

  initializingPromise = new Promise(async (resolve, reject) => {
    if (document.getElementById(CONSTANTS.scriptId)) {
      log("Already loaded script");
      try {
        if (typeof worker === "undefined" || worker === null) {
          log("Worker is undefined or null");
          worker = await createWorker();
        }
        resolve();
      } catch (error) {
        console.error("Error initializing worker: ", error);
        reject(error);
      }
    } else {
      const script = document.createElement("script");
      script.id = CONSTANTS.scriptId;
      script.src = chrome.runtime.getURL("scripts/tessaract/tesseract.min.js");
      (document.head || document.documentElement).appendChild(script);

      script.onload = async function () {
        log("Loaded script");
        log(script.src);

        try {
          if (typeof worker === "undefined" || worker === null) {
            log("Worker is undefined or null");
            worker = await createWorker();
          }
          resolve();
        } catch (error) {
          console.error("Error initializing worker: ", error);
          reject(error);
        }
      };
    }
  }).finally(() => {
    log("finished init");
    initializingPromise = null;
  });
  return initializingPromise;
}

async function createWorker() {
  const worker = await Tesseract.createWorker({
    workerPath: chrome.runtime.getURL(
      "/scripts/tessaract/tesseract.js@v4.0.3_dist_worker.min.js"
    ),
    corePath: chrome.runtime.getURL(
      "scripts/tessaract/tesseract.js-core@4.0.3_tesseract-core-simd.wasm.js"
    ),
    langPath: chrome.runtime.getURL("scripts/tessaract/languages/"),
    logger: (m) => {
      log(m);
    },
  });
  await worker.loadLanguage(getSelectedLanguageCodes());
  await worker.initialize(getSelectedLanguageCodes());
  await worker.setParameters({
    preserve_interword_spaces: OPTIONS.formatOutput ? "1" : "0",
  });

  return worker;
}

function getSelectedLanguageCodes() {
  let selectedLanguageCodes = "";
  CONSTANTS.workerLanguage.forEach((languageCode) => {
    selectedLanguageCodes += languageCode + "+";
  });
  selectedLanguageCodes = selectedLanguageCodes.slice(0, -1);
  log(selectedLanguageCodes);
  return selectedLanguageCodes;
}

function log() {
	if (CONFIG.debug) {
		console.log.apply(console, arguments);
	}
}

