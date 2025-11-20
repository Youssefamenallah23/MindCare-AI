"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var astra_db_ts_1 = require("@datastax/astra-db-ts");
var puppeteer_1 = require("@langchain/community/document_loaders/web/puppeteer");
var generative_ai_1 = require("@google/generative-ai");
var textsplitters_1 = require("@langchain/textsplitters");
require("dotenv/config");
var _a = process.env, ASTRA_DB_NAMESPACE = _a.ASTRA_DB_NAMESPACE, ASTRA_DB_COLLECTION = _a.ASTRA_DB_COLLECTION, ASTRA_DB_ENDPOINT = _a.ASTRA_DB_ENDPOINT, ASTRA_DB_APPLICATION_TOKEN = _a.ASTRA_DB_APPLICATION_TOKEN, GEMINI_API_KEY = _a.GEMINI_API_KEY;
 GEMINI_API_KEY);
var genAI = new generative_ai_1.GoogleGenerativeAI("".concat(GEMINI_API_KEY));
var embeddingModel = genAI.getGenerativeModel({
    model: "text-embedding-004",
});
var data = [
    "https://evidence.nihr.ac.uk/alert/play-and-social-skills-may-protect-children-who-have-difficulties-with-spoken-language/",
    "https://evidence.nihr.ac.uk/alert/loneliness-strongly-linked-depression-older-adults/",
    "https://www.mind.org.uk/information-support/tips-for-everyday-living/student-life/support-and-treatment/",
    "https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/five-steps-to-mental-wellbeing/",
    "https://medlineplus.gov/howtoimprovementalhealth.html",
    "https://www.mentalhealth.org.uk/explore-mental-health/articles/how-support-someone-mental-health-problem",
];
var client = new astra_db_ts_1.DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
var db = client.db(ASTRA_DB_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });
var splitter = new textsplitters_1.RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 100,
});
var createCollection = function () {
    var args_1 = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args_1[_i] = arguments[_i];
    }
    return __awaiter(void 0, __spreadArray([], args_1, true), void 0, function (similarityMetric) {
        var res;
        if (similarityMetric === void 0) { similarityMetric = "dot_product"; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db.createCollection(ASTRA_DB_COLLECTION, {
                        vector: {
                            dimension: 768,
                            metric: similarityMetric,
                        },
                    })];
                case 1:
                    res = _a.sent();
                     res);
                    return [2 /*return*/];
            }
        });
    });
};
var loadSampleData = function () { return __awaiter(void 0, void 0, void 0, function () {
    var collection, _a, data_1, data_1_1, url, content, chunks, _b, chunks_1, chunks_1_1, chunk, embeddingResponse, vectorEmbedding, res, error_1, e_1_1, e_2_1;
    var _c, e_2, _d, _e, _f, e_1, _g, _h;
    return __generator(this, function (_j) {
        switch (_j.label) {
            case 0: return [4 /*yield*/, db.collection(ASTRA_DB_COLLECTION)];
            case 1:
                collection = _j.sent();
                _j.label = 2;
            case 2:
                _j.trys.push([2, 24, 25, 30]);
                _a = true, data_1 = __asyncValues(data);
                _j.label = 3;
            case 3: return [4 /*yield*/, data_1.next()];
            case 4:
                if (!(data_1_1 = _j.sent(), _c = data_1_1.done, !_c)) return [3 /*break*/, 23];
                _e = data_1_1.value;
                _a = false;
                url = _e;
                return [4 /*yield*/, scrapePage(url)];
            case 5:
                content = _j.sent();
                return [4 /*yield*/, splitter.splitText(content)];
            case 6:
                chunks = _j.sent();
                _j.label = 7;
            case 7:
                _j.trys.push([7, 16, 17, 22]);
                _b = true, chunks_1 = (e_1 = void 0, __asyncValues(chunks));
                _j.label = 8;
            case 8: return [4 /*yield*/, chunks_1.next()];
            case 9:
                if (!(chunks_1_1 = _j.sent(), _f = chunks_1_1.done, !_f)) return [3 /*break*/, 15];
                _h = chunks_1_1.value;
                _b = false;
                chunk = _h;
                _j.label = 10;
            case 10:
                _j.trys.push([10, 13, , 14]);
                return [4 /*yield*/, embeddingModel.embedContent({
                        // Use embeddingModel (text-embedding-004)
                        content: { role: "user", parts: [{ text: chunk }] },
                    })];
            case 11:
                embeddingResponse = _j.sent();
                vectorEmbedding = embeddingResponse.embedding.values;
                 "Generated embedding for chunk: ".concat(chunk.substring(0, 50), "..."));
                return [4 /*yield*/, collection.insertOne({
                        pageContent: chunk,
                        $vector: vectorEmbedding,
                        metadata: { source: url },
                    })];
            case 12:
                res = _j.sent();
                 "Chunk stored in DB: ".concat(chunk.substring(0, 50), "..."));
                return [3 /*break*/, 14];
            case 13:
                error_1 = _j.sent();
                console.error("Error generating or storing embedding:", error_1);
                console.error(error_1);
                return [3 /*break*/, 14];
            case 14:
                _b = true;
                return [3 /*break*/, 8];
            case 15: return [3 /*break*/, 22];
            case 16:
                e_1_1 = _j.sent();
                e_1 = { error: e_1_1 };
                return [3 /*break*/, 22];
            case 17:
                _j.trys.push([17, , 20, 21]);
                if (!(!_b && !_f && (_g = chunks_1.return))) return [3 /*break*/, 19];
                return [4 /*yield*/, _g.call(chunks_1)];
            case 18:
                _j.sent();
                _j.label = 19;
            case 19: return [3 /*break*/, 21];
            case 20:
                if (e_1) throw e_1.error;
                return [7 /*endfinally*/];
            case 21: return [7 /*endfinally*/];
            case 22:
                _a = true;
                return [3 /*break*/, 3];
            case 23: return [3 /*break*/, 30];
            case 24:
                e_2_1 = _j.sent();
                e_2 = { error: e_2_1 };
                return [3 /*break*/, 30];
            case 25:
                _j.trys.push([25, , 28, 29]);
                if (!(!_a && !_c && (_d = data_1.return))) return [3 /*break*/, 27];
                return [4 /*yield*/, _d.call(data_1)];
            case 26:
                _j.sent();
                _j.label = 27;
            case 27: return [3 /*break*/, 29];
            case 28:
                if (e_2) throw e_2.error;
                return [7 /*endfinally*/];
            case 29: return [7 /*endfinally*/];
            case 30:
                 "Sample data loaded successfully!");
                return [2 /*return*/];
        }
    });
}); };
var scrapePage = function (url) { return __awaiter(void 0, void 0, void 0, function () {
    var loader;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                loader = new puppeteer_1.PuppeteerWebBaseLoader(url, {
                    launchOptions: {
                        headless: true,
                    },
                    gotoOptions: {
                        waitUntil: "domcontentloaded",
                    },
                    evaluate: function (page, browser) { return __awaiter(void 0, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, page.evaluate(function () {
                                        // Your evaluation logic here
                                        return document.body.innerText;
                                    })];
                                case 1:
                                    result = _a.sent();
                                    return [4 /*yield*/, browser.close()];
                                case 2:
                                    _a.sent();
                                    return [2 /*return*/, result];
                            }
                        });
                    }); },
                });
                return [4 /*yield*/, loader.scrape()];
            case 1: return [2 /*return*/, (_a = (_b.sent())) === null || _a === void 0 ? void 0 : _a.replace(/<[^>]*>?/gm, "")];
        }
    });
}); };
createCollection().then(function () { return loadSampleData(); });
