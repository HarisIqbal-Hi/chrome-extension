"use strict";
// Scalar, Point, Rect, etc are defined by opencv.js (helpers.js) and we need to declare them manually:
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rect_ = exports.Size2l = exports.Size2f = exports.Size2d = exports.Point2d = exports.Point2l = exports.KeyPoint = exports.Point2f = exports.GScalar = exports.OutputArrayOfArrays = exports.OutputArray = exports.InputOutputArrayOfArrays = exports.InputOutputArray = exports.InputArrayOfArrays = exports.InputArray = void 0;
// Hack: expose Mat super classes like Mat_, InputArray, Vector, OutputArray we make them alias of Mat to simplify and make it work
var Mat_1 = require("./Mat");
Object.defineProperty(exports, "InputArray", { enumerable: true, get: function () { return Mat_1.Mat; } });
Object.defineProperty(exports, "InputArrayOfArrays", { enumerable: true, get: function () { return Mat_1.Mat; } });
Object.defineProperty(exports, "InputOutputArray", { enumerable: true, get: function () { return Mat_1.Mat; } });
Object.defineProperty(exports, "InputOutputArrayOfArrays", { enumerable: true, get: function () { return Mat_1.Mat; } });
Object.defineProperty(exports, "OutputArray", { enumerable: true, get: function () { return Mat_1.Mat; } });
Object.defineProperty(exports, "OutputArrayOfArrays", { enumerable: true, get: function () { return Mat_1.Mat; } });
const _1 = require(".");
require("../_cv");
//# sourceMappingURL=_hacks.js.map