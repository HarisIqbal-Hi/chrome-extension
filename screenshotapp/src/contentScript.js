'use strict';
require('jimp');
const { createCanvas} = require('canvas');

let LANGUAGES = {
  Arabic: 'ara',
  'Chinese - Simplified': 'chi_sim',
  'Chinese - Traditional': 'chi_tra',
  German: 'deu',
  English: 'eng',
  French: 'fra',
  Hindi: 'hin',
  Japanese: 'jpn',
  Korean: 'kor',
  Portuguese: 'por',
  Russian: 'rus',
};

const OPTIONS = {
  formatOutput: true,
  showUploadButton: true,
  showLanguageButton: true,
  enableDirectPasting: true,
  enableDragAndDrop: true,
  useThirdPartyOCR: false,
  theme: 'default-mode',
  showInitialLoadingMessage: true,
};

const CONSTANTS = {
  workerLanguage: ['eng'],
  scriptId: 'image-to-text-content-script',
  scriptIdCV: 'opencv-content-script',
};

const CONFIG = {
  debug: true,
};

let initializingPromise = null;
let worker = null;

initialize();
// initializeCV();

addEventListener('mousedown', async (event) => {
  let date = new Date();

  let body = document.body;
  let pos_x = event.pageX;
  let pos_y = event.pageY;
  let filename = `behavidence/${pos_x}_${pos_y}_${date.getTime()}_test.jpg`;

  onOpenCvLoaded();

  chrome.runtime.sendMessage(
    {
      type: 'CaptureTab',
      payload: {
        message: 'Hello, my name is Con. I am from ContentScript.',
      },
    },
    async (response) => {
      log('Message', response);

      let processedImage = await preprocessImage(response.image, filename);

      await (async () => {
        let data = await worker.recognize(processedImage.image);
        log(data.data.text);
        //   // await worker.terminate();
      })();

      saveAs(processedImage, filename);
    }
  );

  //   html2canvas(document.body, {
  //     useCORS: true,
  //  }).then(async function (canvas) {

  //     let data = {};
  //     let image = canvas.toDataURL("image/png");

  //     // await (async () => {
  //     //   data = await worker.recognize(image);
  //     //   // await worker.terminate();
  //     // })();

  //     const ctx = canvas.getContext("2d");

  //     ctx.beginPath();
  //     ctx.arc(pos_x, pos_y, 10, 0, 2 * Math.PI);
  //     ctx.stroke();
  //     ctx.fillStyle = "black";
  //     ctx.fill();

  //     // console.log(data.data.text);

  //     // chrome.runtime.sendMessage(
  //     //   {
  //     //     image: image,
  //     //     filename: `behavidence/${pos_x}_${pos_y}_${date.getTime()}_test.png`,
  //     //   },
  //     //   (response) => {
  //     //     console.log("received user data ", response);
  //     //   }
  //     // );

  //   });
});

function onOpenCvLoaded() {
  log('OpenCV Loaded');
  cv.onRuntimeInitialized = function () {
    const src = new cv.Mat(256, 256, cv.CV_8UC4);
    const dst = new cv.Mat();
    cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
  };
}

function saveAs(uri, filename) {
  var link = document.createElement('a');

  if (typeof link.download === 'string') {
    link.href = uri;
    link.download = filename;

    document.body.appendChild(link);

    link.click();

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
      log('Already loaded script');
      try {
        if (typeof worker === 'undefined' || worker === null) {
          log('Worker is undefined or null');
          worker = await createWorker();
        }
        resolve();
      } catch (error) {
        console.error('Error initializing worker: ', error);
        reject(error);
      }
    } else {
      const script = document.createElement('script');
      script.id = CONSTANTS.scriptId;
      script.src = chrome.runtime.getURL('scripts/tessaract/tesseract.min.js');
      (document.head || document.documentElement).appendChild(script);

      script.onload = async function () {
        log('Loaded script');
        log(script.src);

        try {
          if (typeof worker === 'undefined' || worker === null) {
            log('Worker is undefined or null');
            worker = await createWorker();
          }
          resolve();
        } catch (error) {
          console.error('Error initializing worker: ', error);
          reject(error);
        }
      };
    }
  }).finally(() => {
    log('finished init');
    initializingPromise = null;
  });
  return initializingPromise;
}

async function createWorker() {
  const worker = await Tesseract.createWorker({
    workerPath: chrome.runtime.getURL(
      'scripts/tessaract/tesseract.js@v4.0.3_dist_worker.min.js'
    ),
    corePath: chrome.runtime.getURL(
      'scripts/tessaract/tesseract.js-core@4.0.3_tesseract-core-simd.wasm.js'
    ),
    langPath: chrome.runtime.getURL('scripts/tessaract/languages/'),
    logger: (m) => {
      log(m);
    },
  });
  await worker.loadLanguage(getSelectedLanguageCodes());
  await worker.initialize(getSelectedLanguageCodes());
  await worker.setParameters({
    preserve_interword_spaces: OPTIONS.formatOutput ? '1' : '0',
  });


  return worker;
}

function getSelectedLanguageCodes() {
  let selectedLanguageCodes = '';
  CONSTANTS.workerLanguage.forEach((languageCode) => {
    selectedLanguageCodes += languageCode + '+';
  });
  selectedLanguageCodes = selectedLanguageCodes.slice(0, -1);
  log(selectedLanguageCodes);
  return selectedLanguageCodes;
}

async function preprocessImage(image, filename) {
  return new Promise(async (resolve, reject) => {
    Jimp.read(image, async (err, img) => {
      log(`Image Preprocessing started... : ${filename}`);
      if (err) {
        log(`Error ${err}`);
        throw err;
      }

      img.greyscale();

      let avg = 0;
      let total = 0;

      let binar_1 = 0;
      let binar_2 = 255;
      let threshold = 200;

      img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
        avg +=
          (this.bitmap.data[idx + 0] +
            this.bitmap.data[idx + 1] +
            this.bitmap.data[idx + 2]) /
          3;
        ++total;
      });

      avg /= total;

      if (avg <= 100) {
        binar_1 = 255;
        binar_2 = 0;
        threshold = 120;
      }

      img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
        this.bitmap.data[idx + 0] =
          this.bitmap.data[idx + 0] < threshold ? binar_1 : binar_2;
        this.bitmap.data[idx + 1] =
          this.bitmap.data[idx + 1] < threshold ? binar_1 : binar_2;
        this.bitmap.data[idx + 2] =
          this.bitmap.data[idx + 2] < threshold ? binar_1 : binar_2;
        // var alpha = this.bitmap.data[idx + 3] < 125 ? 0 : 255;
      });

      img.scale(0.9);

      log('Final Color: ', avg);

      let processedImage = await img.getBase64Async(Jimp.MIME_JPEG);

      // saveAs(processedImage, filename);

      resolve({ image: processedImage, raw_image: img});
    });
  });
}

function log() {
  if (CONFIG.debug) {
    console.log.apply(console, arguments);
  }
}

// Communicate with background file by sending a message
// chrome.runtime.sendMessage(
//   {
//     type: 'GREETINGS',
//     payload: {
//       message: 'Hello, my name is Con. I am from ContentScript.',
//     },
//   },
//   (response) => {
//     console.log(response.message);
//   }
// );

// Listen for message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'COUNT') {
    console.log(`Current count is ${request.payload.count}`);
  }

  if (request.type === 'TabCaptured') {
    console.log('TapCapturedLog: ', request);
  }

  // Send an empty response
  // See https://github.com/mozilla/webextension-polyfill/issues/130#issuecomment-531531890
  // sendResponse({});
});

// var files = fs.readdirSync('/ocr_ds');

// myFs.open('ocr_ds/1.png', 'w', function (err, file) {
//   if (err) throw err;
//   console.log("File", file);
// });

async function testRun() {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  let extracted_text = [];

  let prevTime = new Date();
  for (let i = 26; i <= 50; ++i) {
    let image = chrome.runtime.getURL(`ocr_ds/${i}.png`);
    log(image);
    let processedImage = await preprocessImage(image, `${i}.png`);

    await (async () => {
      let data = await worker.recognize(processedImage.image);
      // log(data.data.text);
      // log(data.data.words);
      extracted_text.push(data.data.text);

      getConfidenceOfWords(data.data.words);
      let drawnImage = await drawBBOnImage(data.data.words, processedImage.raw_image);

      saveAs(drawnImage, `${i}.png`);
      //   // await worker.terminate();
    })();
  }
  let currTime = new Date();

  console.log('Time taken: ', (currTime.getTime() - prevTime.getTime()) / 1000);

  for (let i = 0; i < extracted_text.length; ++i)
    log(`${i + 1}: ${extracted_text[i]}`);
}

async function drawBBOnImage(bbArry, img){

  for(let bb of bbArry){
  
    let box = bb.bbox;

    let x1 = box.x0;
    let x2 = box.x1;
    let y1 = box.y0;
    let y2 = box.y1;

    img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {

      if((x >= x1 && x <= x2 && (y == y1 || y == y2)) || (y >= y1 && y <= y2 && (x == x1 || x == x2))){
        this.bitmap.data[idx + 0] = 255;
        this.bitmap.data[idx + 1] = 255;
        this.bitmap.data[idx + 2] = 0;
      }
    });

  }

  return await img.getBase64Async(Jimp.MIME_JPEG);
}

function getConfidenceOfWords(bbArry){
  log(bbArry);
}

testRun();
