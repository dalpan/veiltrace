"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf, __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require < "u" ? require : typeof Proxy < "u" ? new Proxy(x, {
    get: (a, b) => (typeof require < "u" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require < "u") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __commonJS = (cb, mod) => function() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from == "object" || typeof from == "function")
      for (let key of __getOwnPropNames(from))
        !__hasOwnProp.call(to, key) && key !== except && __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: !0 }) : target,
    mod
  ));

  // node_modules/regenerator-runtime/runtime.js
  var require_runtime = __commonJS({
    "node_modules/regenerator-runtime/runtime.js"(exports, module) {
      var runtime = (function(exports2) {
        "use strict";
        var Op = Object.prototype, hasOwn = Op.hasOwnProperty, defineProperty = Object.defineProperty || function(obj, key, desc) {
          obj[key] = desc.value;
        }, undefined2, $Symbol = typeof Symbol == "function" ? Symbol : {}, iteratorSymbol = $Symbol.iterator || "@@iterator", asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator", toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";
        function define(obj, key, value) {
          return Object.defineProperty(obj, key, {
            value,
            enumerable: !0,
            configurable: !0,
            writable: !0
          }), obj[key];
        }
        try {
          define({}, "");
        } catch {
          define = function(obj, key, value) {
            return obj[key] = value;
          };
        }
        function wrap(innerFn, outerFn, self, tryLocsList) {
          var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator, generator = Object.create(protoGenerator.prototype), context = new Context(tryLocsList || []);
          return defineProperty(generator, "_invoke", { value: makeInvokeMethod(innerFn, self, context) }), generator;
        }
        exports2.wrap = wrap;
        function tryCatch(fn, obj, arg) {
          try {
            return { type: "normal", arg: fn.call(obj, arg) };
          } catch (err) {
            return { type: "throw", arg: err };
          }
        }
        var GenStateSuspendedStart = "suspendedStart", GenStateSuspendedYield = "suspendedYield", GenStateExecuting = "executing", GenStateCompleted = "completed", ContinueSentinel = {};
        function Generator() {
        }
        function GeneratorFunction() {
        }
        function GeneratorFunctionPrototype() {
        }
        var IteratorPrototype = {};
        define(IteratorPrototype, iteratorSymbol, function() {
          return this;
        });
        var getProto = Object.getPrototypeOf, NativeIteratorPrototype = getProto && getProto(getProto(values([])));
        NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol) && (IteratorPrototype = NativeIteratorPrototype);
        var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype);
        GeneratorFunction.prototype = GeneratorFunctionPrototype, defineProperty(Gp, "constructor", { value: GeneratorFunctionPrototype, configurable: !0 }), defineProperty(
          GeneratorFunctionPrototype,
          "constructor",
          { value: GeneratorFunction, configurable: !0 }
        ), GeneratorFunction.displayName = define(
          GeneratorFunctionPrototype,
          toStringTagSymbol,
          "GeneratorFunction"
        );
        function defineIteratorMethods(prototype) {
          ["next", "throw", "return"].forEach(function(method) {
            define(prototype, method, function(arg) {
              return this._invoke(method, arg);
            });
          });
        }
        exports2.isGeneratorFunction = function(genFun) {
          var ctor = typeof genFun == "function" && genFun.constructor;
          return ctor ? ctor === GeneratorFunction || // For the native GeneratorFunction constructor, the best we can
          // do is to check its .name property.
          (ctor.displayName || ctor.name) === "GeneratorFunction" : !1;
        }, exports2.mark = function(genFun) {
          return Object.setPrototypeOf ? Object.setPrototypeOf(genFun, GeneratorFunctionPrototype) : (genFun.__proto__ = GeneratorFunctionPrototype, define(genFun, toStringTagSymbol, "GeneratorFunction")), genFun.prototype = Object.create(Gp), genFun;
        }, exports2.awrap = function(arg) {
          return { __await: arg };
        };
        function AsyncIterator(generator, PromiseImpl) {
          function invoke(method, arg, resolve, reject) {
            var record = tryCatch(generator[method], generator, arg);
            if (record.type === "throw")
              reject(record.arg);
            else {
              var result = record.arg, value = result.value;
              return value && typeof value == "object" && hasOwn.call(value, "__await") ? PromiseImpl.resolve(value.__await).then(function(value2) {
                invoke("next", value2, resolve, reject);
              }, function(err) {
                invoke("throw", err, resolve, reject);
              }) : PromiseImpl.resolve(value).then(function(unwrapped) {
                result.value = unwrapped, resolve(result);
              }, function(error) {
                return invoke("throw", error, resolve, reject);
              });
            }
          }
          var previousPromise;
          function enqueue(method, arg) {
            function callInvokeWithMethodAndArg() {
              return new PromiseImpl(function(resolve, reject) {
                invoke(method, arg, resolve, reject);
              });
            }
            return previousPromise = // If enqueue has been called before, then we want to wait until
            // all previous Promises have been resolved before calling invoke,
            // so that results are always delivered in the correct order. If
            // enqueue has not been called before, then it is important to
            // call invoke immediately, without waiting on a callback to fire,
            // so that the async generator function has the opportunity to do
            // any necessary setup in a predictable way. This predictability
            // is why the Promise constructor synchronously invokes its
            // executor callback, and why async functions synchronously
            // execute code before the first await. Since we implement simple
            // async functions in terms of async generators, it is especially
            // important to get this right, even though it requires care.
            previousPromise ? previousPromise.then(
              callInvokeWithMethodAndArg,
              // Avoid propagating failures to Promises returned by later
              // invocations of the iterator.
              callInvokeWithMethodAndArg
            ) : callInvokeWithMethodAndArg();
          }
          defineProperty(this, "_invoke", { value: enqueue });
        }
        defineIteratorMethods(AsyncIterator.prototype), define(AsyncIterator.prototype, asyncIteratorSymbol, function() {
          return this;
        }), exports2.AsyncIterator = AsyncIterator, exports2.async = function(innerFn, outerFn, self, tryLocsList, PromiseImpl) {
          PromiseImpl === void 0 && (PromiseImpl = Promise);
          var iter = new AsyncIterator(
            wrap(innerFn, outerFn, self, tryLocsList),
            PromiseImpl
          );
          return exports2.isGeneratorFunction(outerFn) ? iter : iter.next().then(function(result) {
            return result.done ? result.value : iter.next();
          });
        };
        function makeInvokeMethod(innerFn, self, context) {
          var state = GenStateSuspendedStart;
          return function(method, arg) {
            if (state === GenStateExecuting)
              throw new Error("Generator is already running");
            if (state === GenStateCompleted) {
              if (method === "throw")
                throw arg;
              return doneResult();
            }
            for (context.method = method, context.arg = arg; ; ) {
              var delegate = context.delegate;
              if (delegate) {
                var delegateResult = maybeInvokeDelegate(delegate, context);
                if (delegateResult) {
                  if (delegateResult === ContinueSentinel) continue;
                  return delegateResult;
                }
              }
              if (context.method === "next")
                context.sent = context._sent = context.arg;
              else if (context.method === "throw") {
                if (state === GenStateSuspendedStart)
                  throw state = GenStateCompleted, context.arg;
                context.dispatchException(context.arg);
              } else context.method === "return" && context.abrupt("return", context.arg);
              state = GenStateExecuting;
              var record = tryCatch(innerFn, self, context);
              if (record.type === "normal") {
                if (state = context.done ? GenStateCompleted : GenStateSuspendedYield, record.arg === ContinueSentinel)
                  continue;
                return {
                  value: record.arg,
                  done: context.done
                };
              } else record.type === "throw" && (state = GenStateCompleted, context.method = "throw", context.arg = record.arg);
            }
          };
        }
        function maybeInvokeDelegate(delegate, context) {
          var methodName = context.method, method = delegate.iterator[methodName];
          if (method === undefined2)
            return context.delegate = null, methodName === "throw" && delegate.iterator.return && (context.method = "return", context.arg = undefined2, maybeInvokeDelegate(delegate, context), context.method === "throw") || methodName !== "return" && (context.method = "throw", context.arg = new TypeError(
              "The iterator does not provide a '" + methodName + "' method"
            )), ContinueSentinel;
          var record = tryCatch(method, delegate.iterator, context.arg);
          if (record.type === "throw")
            return context.method = "throw", context.arg = record.arg, context.delegate = null, ContinueSentinel;
          var info = record.arg;
          if (!info)
            return context.method = "throw", context.arg = new TypeError("iterator result is not an object"), context.delegate = null, ContinueSentinel;
          if (info.done)
            context[delegate.resultName] = info.value, context.next = delegate.nextLoc, context.method !== "return" && (context.method = "next", context.arg = undefined2);
          else
            return info;
          return context.delegate = null, ContinueSentinel;
        }
        defineIteratorMethods(Gp), define(Gp, toStringTagSymbol, "Generator"), define(Gp, iteratorSymbol, function() {
          return this;
        }), define(Gp, "toString", function() {
          return "[object Generator]";
        });
        function pushTryEntry(locs) {
          var entry = { tryLoc: locs[0] };
          1 in locs && (entry.catchLoc = locs[1]), 2 in locs && (entry.finallyLoc = locs[2], entry.afterLoc = locs[3]), this.tryEntries.push(entry);
        }
        function resetTryEntry(entry) {
          var record = entry.completion || {};
          record.type = "normal", delete record.arg, entry.completion = record;
        }
        function Context(tryLocsList) {
          this.tryEntries = [{ tryLoc: "root" }], tryLocsList.forEach(pushTryEntry, this), this.reset(!0);
        }
        exports2.keys = function(val) {
          var object = Object(val), keys = [];
          for (var key in object)
            keys.push(key);
          return keys.reverse(), function next() {
            for (; keys.length; ) {
              var key2 = keys.pop();
              if (key2 in object)
                return next.value = key2, next.done = !1, next;
            }
            return next.done = !0, next;
          };
        };
        function values(iterable) {
          if (iterable) {
            var iteratorMethod = iterable[iteratorSymbol];
            if (iteratorMethod)
              return iteratorMethod.call(iterable);
            if (typeof iterable.next == "function")
              return iterable;
            if (!isNaN(iterable.length)) {
              var i = -1, next = function next2() {
                for (; ++i < iterable.length; )
                  if (hasOwn.call(iterable, i))
                    return next2.value = iterable[i], next2.done = !1, next2;
                return next2.value = undefined2, next2.done = !0, next2;
              };
              return next.next = next;
            }
          }
          return { next: doneResult };
        }
        exports2.values = values;
        function doneResult() {
          return { value: undefined2, done: !0 };
        }
        return Context.prototype = {
          constructor: Context,
          reset: function(skipTempReset) {
            if (this.prev = 0, this.next = 0, this.sent = this._sent = undefined2, this.done = !1, this.delegate = null, this.method = "next", this.arg = undefined2, this.tryEntries.forEach(resetTryEntry), !skipTempReset)
              for (var name in this)
                name.charAt(0) === "t" && hasOwn.call(this, name) && !isNaN(+name.slice(1)) && (this[name] = undefined2);
          },
          stop: function() {
            this.done = !0;
            var rootEntry = this.tryEntries[0], rootRecord = rootEntry.completion;
            if (rootRecord.type === "throw")
              throw rootRecord.arg;
            return this.rval;
          },
          dispatchException: function(exception) {
            if (this.done)
              throw exception;
            var context = this;
            function handle(loc, caught) {
              return record.type = "throw", record.arg = exception, context.next = loc, caught && (context.method = "next", context.arg = undefined2), !!caught;
            }
            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
              var entry = this.tryEntries[i], record = entry.completion;
              if (entry.tryLoc === "root")
                return handle("end");
              if (entry.tryLoc <= this.prev) {
                var hasCatch = hasOwn.call(entry, "catchLoc"), hasFinally = hasOwn.call(entry, "finallyLoc");
                if (hasCatch && hasFinally) {
                  if (this.prev < entry.catchLoc)
                    return handle(entry.catchLoc, !0);
                  if (this.prev < entry.finallyLoc)
                    return handle(entry.finallyLoc);
                } else if (hasCatch) {
                  if (this.prev < entry.catchLoc)
                    return handle(entry.catchLoc, !0);
                } else if (hasFinally) {
                  if (this.prev < entry.finallyLoc)
                    return handle(entry.finallyLoc);
                } else
                  throw new Error("try statement without catch or finally");
              }
            }
          },
          abrupt: function(type, arg) {
            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
              var entry = this.tryEntries[i];
              if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) {
                var finallyEntry = entry;
                break;
              }
            }
            finallyEntry && (type === "break" || type === "continue") && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc && (finallyEntry = null);
            var record = finallyEntry ? finallyEntry.completion : {};
            return record.type = type, record.arg = arg, finallyEntry ? (this.method = "next", this.next = finallyEntry.finallyLoc, ContinueSentinel) : this.complete(record);
          },
          complete: function(record, afterLoc) {
            if (record.type === "throw")
              throw record.arg;
            return record.type === "break" || record.type === "continue" ? this.next = record.arg : record.type === "return" ? (this.rval = this.arg = record.arg, this.method = "return", this.next = "end") : record.type === "normal" && afterLoc && (this.next = afterLoc), ContinueSentinel;
          },
          finish: function(finallyLoc) {
            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
              var entry = this.tryEntries[i];
              if (entry.finallyLoc === finallyLoc)
                return this.complete(entry.completion, entry.afterLoc), resetTryEntry(entry), ContinueSentinel;
            }
          },
          catch: function(tryLoc) {
            for (var i = this.tryEntries.length - 1; i >= 0; --i) {
              var entry = this.tryEntries[i];
              if (entry.tryLoc === tryLoc) {
                var record = entry.completion;
                if (record.type === "throw") {
                  var thrown = record.arg;
                  resetTryEntry(entry);
                }
                return thrown;
              }
            }
            throw new Error("illegal catch attempt");
          },
          delegateYield: function(iterable, resultName, nextLoc) {
            return this.delegate = {
              iterator: values(iterable),
              resultName,
              nextLoc
            }, this.method === "next" && (this.arg = undefined2), ContinueSentinel;
          }
        }, exports2;
      })(
        // If this script is executing as a CommonJS module, use module.exports
        // as the regeneratorRuntime namespace. Otherwise create a new empty
        // object. Either way, the resulting object will be used to initialize
        // the regeneratorRuntime variable at the top of this file.
        typeof module == "object" ? module.exports : {}
      );
      try {
        regeneratorRuntime = runtime;
      } catch {
        typeof globalThis == "object" ? globalThis.regeneratorRuntime = runtime : Function("r", "regeneratorRuntime = r")(runtime);
      }
    }
  });

  // node_modules/tesseract.js/src/utils/getId.js
  var require_getId = __commonJS({
    "node_modules/tesseract.js/src/utils/getId.js"(exports, module) {
      "use strict";
      module.exports = (prefix, cnt) => `${prefix}-${cnt}-${Math.random().toString(16).slice(3, 8)}`;
    }
  });

  // node_modules/tesseract.js/src/createJob.js
  var require_createJob = __commonJS({
    "node_modules/tesseract.js/src/createJob.js"(exports, module) {
      "use strict";
      var getId = require_getId(), jobCounter = 0;
      module.exports = ({
        id: _id,
        action,
        payload = {}
      }) => {
        let id = _id;
        return typeof id > "u" && (id = getId("Job", jobCounter), jobCounter += 1), {
          id,
          action,
          payload
        };
      };
    }
  });

  // node_modules/tesseract.js/src/utils/log.js
  var require_log = __commonJS({
    "node_modules/tesseract.js/src/utils/log.js"(exports) {
      "use strict";
      var logging = !1;
      exports.logging = logging;
      exports.setLogging = (_logging) => {
        logging = _logging;
      };
      exports.log = (...args) => logging ? console.log.apply(exports, args) : null;
    }
  });

  // node_modules/tesseract.js/src/createScheduler.js
  var require_createScheduler = __commonJS({
    "node_modules/tesseract.js/src/createScheduler.js"(exports, module) {
      "use strict";
      var createJob = require_createJob(), { log } = require_log(), getId = require_getId(), schedulerCounter = 0;
      module.exports = () => {
        let id = getId("Scheduler", schedulerCounter), workers = {}, runningWorkers = {}, jobQueue = [];
        schedulerCounter += 1;
        let getQueueLen = () => jobQueue.length, getNumWorkers = () => Object.keys(workers).length, dequeue = () => {
          if (jobQueue.length !== 0) {
            let wIds = Object.keys(workers);
            for (let i = 0; i < wIds.length; i += 1)
              if (typeof runningWorkers[wIds[i]] > "u") {
                jobQueue[0](workers[wIds[i]]);
                break;
              }
          }
        }, queue = (action, payload) => new Promise((resolve, reject) => {
          let job = createJob({ action, payload });
          jobQueue.push(async (w) => {
            jobQueue.shift(), runningWorkers[w.id] = job;
            try {
              resolve(await w[action].apply(exports, [...payload, job.id]));
            } catch (err) {
              reject(err);
            } finally {
              delete runningWorkers[w.id], dequeue();
            }
          }), log(`[${id}]: Add ${job.id} to JobQueue`), log(`[${id}]: JobQueue length=${jobQueue.length}`), dequeue();
        });
        return {
          addWorker: (w) => (workers[w.id] = w, log(`[${id}]: Add ${w.id}`), log(`[${id}]: Number of workers=${getNumWorkers()}`), dequeue(), w.id),
          addJob: async (action, ...payload) => {
            if (getNumWorkers() === 0)
              throw Error(`[${id}]: You need to have at least one worker before adding jobs`);
            return queue(action, payload);
          },
          terminate: async () => {
            Object.keys(workers).forEach(async (wid) => {
              await workers[wid].terminate();
            }), jobQueue = [];
          },
          getQueueLen,
          getNumWorkers
        };
      };
    }
  });

  // node_modules/tesseract.js/src/utils/getEnvironment.js
  var require_getEnvironment = __commonJS({
    "node_modules/tesseract.js/src/utils/getEnvironment.js"(exports, module) {
      "use strict";
      module.exports = (key) => {
        let env = {};
        return typeof WorkerGlobalScope < "u" ? env.type = "webworker" : typeof document == "object" ? env.type = "browser" : typeof process == "object" && typeof __require == "function" && (env.type = "node"), typeof key > "u" ? env : env[key];
      };
    }
  });

  // node_modules/tesseract.js/src/utils/resolvePaths.js
  var require_resolvePaths = __commonJS({
    "node_modules/tesseract.js/src/utils/resolvePaths.js"(exports, module) {
      "use strict";
      var isBrowser = require_getEnvironment()("type") === "browser", resolveURL = isBrowser ? (s) => new URL(s, window.location.href).href : (s) => s;
      module.exports = (options) => {
        let opts = { ...options };
        return ["corePath", "workerPath", "langPath"].forEach((key) => {
          options[key] && (opts[key] = resolveURL(opts[key]));
        }), opts;
      };
    }
  });

  // node_modules/tesseract.js/src/constants/OEM.js
  var require_OEM = __commonJS({
    "node_modules/tesseract.js/src/constants/OEM.js"(exports, module) {
      "use strict";
      module.exports = {
        TESSERACT_ONLY: 0,
        LSTM_ONLY: 1,
        TESSERACT_LSTM_COMBINED: 2,
        DEFAULT: 3
      };
    }
  });

  // node_modules/tesseract.js/package.json
  var require_package = __commonJS({
    "node_modules/tesseract.js/package.json"(exports, module) {
      module.exports = {
        name: "tesseract.js",
        version: "7.0.0",
        description: "Pure Javascript Multilingual OCR",
        main: "src/index.js",
        type: "commonjs",
        types: "src/index.d.ts",
        unpkg: "dist/tesseract.min.js",
        jsdelivr: "dist/tesseract.min.js",
        scripts: {
          start: "node scripts/server.js",
          build: "rimraf dist && webpack --config scripts/webpack.config.prod.js && rollup -c scripts/rollup.esm.mjs",
          "profile:tesseract": "webpack-bundle-analyzer dist/tesseract-stats.json",
          "profile:worker": "webpack-bundle-analyzer dist/worker-stats.json",
          prepublishOnly: "npm run build",
          wait: "rimraf dist && wait-on http://localhost:3000/dist/tesseract.min.js",
          test: "npm-run-all -p -r start test:all",
          "test:all": "npm-run-all wait test:browser test:node:all",
          "test:browser": "karma start karma.conf.js",
          "test:node": "nyc mocha --exit --bail --require ./scripts/test-helper.mjs",
          "test:node:all": "npm run test:node -- ./tests/*.test.mjs",
          lint: "eslint src",
          "lint:fix": "eslint --fix src",
          postinstall: "opencollective-postinstall || true"
        },
        browser: {
          "./src/worker/node/index.js": "./src/worker/browser/index.js"
        },
        author: "",
        contributors: [
          "jeromewu"
        ],
        license: "Apache-2.0",
        devDependencies: {
          "@babel/core": "^7.21.4",
          "@babel/eslint-parser": "^7.21.3",
          "@babel/preset-env": "^7.21.4",
          "@rollup/plugin-commonjs": "^24.1.0",
          acorn: "^8.8.2",
          "babel-loader": "^9.1.2",
          buffer: "^6.0.3",
          cors: "^2.8.5",
          eslint: "^7.32.0",
          "eslint-config-airbnb-base": "^14.2.1",
          "eslint-plugin-import": "^2.27.5",
          "expect.js": "^0.3.1",
          express: "^4.18.2",
          mocha: "^10.2.0",
          "npm-run-all": "^4.1.5",
          karma: "^6.4.2",
          "karma-chrome-launcher": "^3.2.0",
          "karma-firefox-launcher": "^2.1.2",
          "karma-mocha": "^2.0.1",
          "karma-webpack": "^5.0.0",
          nyc: "^15.1.0",
          rimraf: "^5.0.0",
          rollup: "^3.20.7",
          "wait-on": "^7.0.1",
          webpack: "^5.79.0",
          "webpack-bundle-analyzer": "^4.8.0",
          "webpack-cli": "^5.0.1",
          "webpack-dev-middleware": "^6.0.2",
          "rollup-plugin-sourcemaps": "^0.6.3"
        },
        dependencies: {
          "bmp-js": "^0.1.0",
          "idb-keyval": "^6.2.0",
          "is-url": "^1.2.4",
          "node-fetch": "^2.6.9",
          "opencollective-postinstall": "^2.0.3",
          "regenerator-runtime": "^0.13.3",
          "tesseract.js-core": "^7.0.0",
          "wasm-feature-detect": "^1.8.0",
          zlibjs: "^0.3.1"
        },
        overrides: {
          "@rollup/pluginutils": "^5.0.2"
        },
        repository: {
          type: "git",
          url: "https://github.com/naptha/tesseract.js.git"
        },
        bugs: {
          url: "https://github.com/naptha/tesseract.js/issues"
        },
        homepage: "https://github.com/naptha/tesseract.js",
        collective: {
          type: "opencollective",
          url: "https://opencollective.com/tesseractjs"
        }
      };
    }
  });

  // node_modules/tesseract.js/src/constants/defaultOptions.js
  var require_defaultOptions = __commonJS({
    "node_modules/tesseract.js/src/constants/defaultOptions.js"(exports, module) {
      "use strict";
      module.exports = {
        /*
         * Use BlobURL for worker script by default
         * TODO: remove this option
         *
         */
        workerBlobURL: !0,
        logger: () => {
        }
      };
    }
  });

  // node_modules/tesseract.js/src/worker/browser/defaultOptions.js
  var require_defaultOptions2 = __commonJS({
    "node_modules/tesseract.js/src/worker/browser/defaultOptions.js"(exports, module) {
      "use strict";
      var version = require_package().version, defaultOptions = require_defaultOptions();
      module.exports = {
        ...defaultOptions,
        workerPath: `https://cdn.jsdelivr.net/npm/tesseract.js@v${version}/dist/worker.min.js`
      };
    }
  });

  // node_modules/tesseract.js/src/worker/browser/spawnWorker.js
  var require_spawnWorker = __commonJS({
    "node_modules/tesseract.js/src/worker/browser/spawnWorker.js"(exports, module) {
      "use strict";
      module.exports = ({ workerPath, workerBlobURL }) => {
        let worker2;
        if (Blob && URL && workerBlobURL) {
          let blob = new Blob([`importScripts("${workerPath}");`], {
            type: "application/javascript"
          });
          worker2 = new Worker(URL.createObjectURL(blob));
        } else
          worker2 = new Worker(workerPath);
        return worker2;
      };
    }
  });

  // node_modules/tesseract.js/src/worker/browser/terminateWorker.js
  var require_terminateWorker = __commonJS({
    "node_modules/tesseract.js/src/worker/browser/terminateWorker.js"(exports, module) {
      "use strict";
      module.exports = (worker2) => {
        worker2.terminate();
      };
    }
  });

  // node_modules/tesseract.js/src/worker/browser/onMessage.js
  var require_onMessage = __commonJS({
    "node_modules/tesseract.js/src/worker/browser/onMessage.js"(exports, module) {
      "use strict";
      module.exports = (worker2, handler) => {
        worker2.onmessage = ({ data }) => {
          handler(data);
        };
      };
    }
  });

  // node_modules/tesseract.js/src/worker/browser/send.js
  var require_send = __commonJS({
    "node_modules/tesseract.js/src/worker/browser/send.js"(exports, module) {
      "use strict";
      module.exports = async (worker2, packet) => {
        worker2.postMessage(packet);
      };
    }
  });

  // node_modules/tesseract.js/src/worker/browser/loadImage.js
  var require_loadImage = __commonJS({
    "node_modules/tesseract.js/src/worker/browser/loadImage.js"(exports, module) {
      "use strict";
      var readFromBlobOrFile = (blob) => new Promise((resolve, reject) => {
        let fileReader = new FileReader();
        fileReader.onload = () => {
          resolve(fileReader.result);
        }, fileReader.onerror = ({ target: { error: { code } } }) => {
          reject(Error(`File could not be read! Code=${code}`));
        }, fileReader.readAsArrayBuffer(blob);
      }), loadImage = async (image) => {
        let data = image;
        if (typeof image > "u")
          return "undefined";
        if (typeof image == "string")
          /data:image\/([a-zA-Z]*);base64,([^"]*)/.test(image) ? data = atob(image.split(",")[1]).split("").map((c) => c.charCodeAt(0)) : data = await (await fetch(image)).arrayBuffer();
        else if (typeof HTMLElement < "u" && image instanceof HTMLElement)
          image.tagName === "IMG" && (data = await loadImage(image.src)), image.tagName === "VIDEO" && (data = await loadImage(image.poster)), image.tagName === "CANVAS" && await new Promise((resolve) => {
            image.toBlob(async (blob) => {
              data = await readFromBlobOrFile(blob), resolve();
            });
          });
        else if (typeof OffscreenCanvas < "u" && image instanceof OffscreenCanvas) {
          let blob = await image.convertToBlob();
          data = await readFromBlobOrFile(blob);
        } else (image instanceof File || image instanceof Blob) && (data = await readFromBlobOrFile(image));
        return new Uint8Array(data);
      };
      module.exports = loadImage;
    }
  });

  // node_modules/tesseract.js/src/worker/browser/index.js
  var require_browser = __commonJS({
    "node_modules/tesseract.js/src/worker/browser/index.js"(exports, module) {
      "use strict";
      var defaultOptions = require_defaultOptions2(), spawnWorker = require_spawnWorker(), terminateWorker = require_terminateWorker(), onMessage = require_onMessage(), send = require_send(), loadImage = require_loadImage();
      module.exports = {
        defaultOptions,
        spawnWorker,
        terminateWorker,
        onMessage,
        send,
        loadImage
      };
    }
  });

  // node_modules/tesseract.js/src/createWorker.js
  var require_createWorker = __commonJS({
    "node_modules/tesseract.js/src/createWorker.js"(exports, module) {
      "use strict";
      var resolvePaths = require_resolvePaths(), createJob = require_createJob(), { log } = require_log(), getId = require_getId(), OEM2 = require_OEM(), {
        defaultOptions,
        spawnWorker,
        terminateWorker,
        onMessage,
        loadImage,
        send
      } = require_browser(), workerCounter = 0;
      module.exports = async (langs = "eng", oem = OEM2.LSTM_ONLY, _options = {}, config = {}) => {
        let id = getId("Worker", workerCounter), {
          logger,
          errorHandler,
          ...options
        } = resolvePaths({
          ...defaultOptions,
          ..._options
        }), promises = {}, currentLangs = typeof langs == "string" ? langs.split("+") : langs, currentOem = oem, currentConfig = config, lstmOnlyCore = [OEM2.DEFAULT, OEM2.LSTM_ONLY].includes(oem) && !options.legacyCore, workerResReject, workerResResolve, workerRes = new Promise((resolve, reject) => {
          workerResResolve = resolve, workerResReject = reject;
        }), workerError = (event) => {
          workerResReject(event.message);
        }, worker2 = spawnWorker(options);
        worker2.onerror = workerError, workerCounter += 1;
        let startJob = ({ id: jobId, action, payload }) => new Promise((resolve, reject) => {
          log(`[${id}]: Start ${jobId}, action=${action}`);
          let promiseId = `${action}-${jobId}`;
          promises[promiseId] = { resolve, reject }, send(worker2, {
            workerId: id,
            jobId,
            action,
            payload
          });
        }), load = () => console.warn("`load` is depreciated and should be removed from code (workers now come pre-loaded)"), loadInternal = (jobId) => startJob(createJob({
          id: jobId,
          action: "load",
          payload: { options: { lstmOnly: lstmOnlyCore, corePath: options.corePath, logging: options.logging } }
        })), writeText = (path, text, jobId) => startJob(createJob({
          id: jobId,
          action: "FS",
          payload: { method: "writeFile", args: [path, text] }
        })), readText = (path, jobId) => startJob(createJob({
          id: jobId,
          action: "FS",
          payload: { method: "readFile", args: [path, { encoding: "utf8" }] }
        })), removeFile = (path, jobId) => startJob(createJob({
          id: jobId,
          action: "FS",
          payload: { method: "unlink", args: [path] }
        })), FS = (method, args, jobId) => startJob(createJob({
          id: jobId,
          action: "FS",
          payload: { method, args }
        })), loadLanguageInternal = (_langs, jobId) => startJob(createJob({
          id: jobId,
          action: "loadLanguage",
          payload: {
            langs: _langs,
            options: {
              langPath: options.langPath,
              dataPath: options.dataPath,
              cachePath: options.cachePath,
              cacheMethod: options.cacheMethod,
              gzip: options.gzip,
              lstmOnly: [OEM2.DEFAULT, OEM2.LSTM_ONLY].includes(currentOem) && !options.legacyLang
            }
          }
        })), initializeInternal = (_langs, _oem, _config, jobId) => startJob(createJob({
          id: jobId,
          action: "initialize",
          payload: { langs: _langs, oem: _oem, config: _config }
        })), reinitialize = (langs2 = "eng", oem2, config2, jobId) => {
          if (lstmOnlyCore && [OEM2.TESSERACT_ONLY, OEM2.TESSERACT_LSTM_COMBINED].includes(oem2)) throw Error("Legacy model requested but code missing.");
          let _oem = oem2 || currentOem;
          currentOem = _oem;
          let _config = config2 || currentConfig;
          currentConfig = _config;
          let _langs = (typeof langs2 == "string" ? langs2.split("+") : langs2).filter((x) => !currentLangs.includes(x));
          return currentLangs.push(..._langs), _langs.length > 0 ? loadLanguageInternal(_langs, jobId).then(() => initializeInternal(langs2, _oem, _config, jobId)) : initializeInternal(langs2, _oem, _config, jobId);
        }, setParameters = (params = {}, jobId) => startJob(createJob({
          id: jobId,
          action: "setParameters",
          payload: { params }
        })), recognize = async (image, opts = {}, output = {
          text: !0
        }, jobId) => startJob(createJob({
          id: jobId,
          action: "recognize",
          payload: { image: await loadImage(image), options: opts, output }
        })), detect = async (image, jobId) => {
          if (lstmOnlyCore) throw Error("`worker.detect` requires Legacy model, which was not loaded.");
          return startJob(createJob({
            id: jobId,
            action: "detect",
            payload: { image: await loadImage(image) }
          }));
        }, terminate = async () => (worker2 !== null && (terminateWorker(worker2), worker2 = null), Promise.resolve());
        onMessage(worker2, ({
          workerId,
          jobId,
          status,
          action,
          data
        }) => {
          let promiseId = `${action}-${jobId}`;
          if (status === "resolve")
            log(`[${workerId}]: Complete ${jobId}`), promises[promiseId].resolve({ jobId, data }), delete promises[promiseId];
          else if (status === "reject")
            if (promises[promiseId].reject(data), delete promises[promiseId], action === "load" && workerResReject(data), errorHandler)
              errorHandler(data);
            else
              throw Error(data);
          else status === "progress" && logger({ ...data, userJobId: jobId });
        });
        let resolveObj = {
          id,
          worker: worker2,
          load,
          writeText,
          readText,
          removeFile,
          FS,
          reinitialize,
          setParameters,
          recognize,
          detect,
          terminate
        };
        return loadInternal().then(() => loadLanguageInternal(langs)).then(() => initializeInternal(langs, oem, config)).then(() => workerResResolve(resolveObj)).catch(() => {
        }), workerRes;
      };
    }
  });

  // node_modules/tesseract.js/src/Tesseract.js
  var require_Tesseract = __commonJS({
    "node_modules/tesseract.js/src/Tesseract.js"(exports, module) {
      "use strict";
      var createWorker2 = require_createWorker(), recognize = async (image, langs, options) => {
        let worker2 = await createWorker2(langs, 1, options);
        return worker2.recognize(image).finally(async () => {
          await worker2.terminate();
        });
      }, detect = async (image, options) => {
        let worker2 = await createWorker2("osd", 0, options);
        return worker2.detect(image).finally(async () => {
          await worker2.terminate();
        });
      };
      module.exports = {
        recognize,
        detect
      };
    }
  });

  // node_modules/tesseract.js/src/constants/languages.js
  var require_languages = __commonJS({
    "node_modules/tesseract.js/src/constants/languages.js"(exports, module) {
      "use strict";
      module.exports = {
        AFR: "afr",
        AMH: "amh",
        ARA: "ara",
        ASM: "asm",
        AZE: "aze",
        AZE_CYRL: "aze_cyrl",
        BEL: "bel",
        BEN: "ben",
        BOD: "bod",
        BOS: "bos",
        BUL: "bul",
        CAT: "cat",
        CEB: "ceb",
        CES: "ces",
        CHI_SIM: "chi_sim",
        CHI_TRA: "chi_tra",
        CHR: "chr",
        CYM: "cym",
        DAN: "dan",
        DEU: "deu",
        DZO: "dzo",
        ELL: "ell",
        ENG: "eng",
        ENM: "enm",
        EPO: "epo",
        EST: "est",
        EUS: "eus",
        FAS: "fas",
        FIN: "fin",
        FRA: "fra",
        FRK: "frk",
        FRM: "frm",
        GLE: "gle",
        GLG: "glg",
        GRC: "grc",
        GUJ: "guj",
        HAT: "hat",
        HEB: "heb",
        HIN: "hin",
        HRV: "hrv",
        HUN: "hun",
        IKU: "iku",
        IND: "ind",
        ISL: "isl",
        ITA: "ita",
        ITA_OLD: "ita_old",
        JAV: "jav",
        JPN: "jpn",
        KAN: "kan",
        KAT: "kat",
        KAT_OLD: "kat_old",
        KAZ: "kaz",
        KHM: "khm",
        KIR: "kir",
        KOR: "kor",
        KUR: "kur",
        LAO: "lao",
        LAT: "lat",
        LAV: "lav",
        LIT: "lit",
        MAL: "mal",
        MAR: "mar",
        MKD: "mkd",
        MLT: "mlt",
        MSA: "msa",
        MYA: "mya",
        NEP: "nep",
        NLD: "nld",
        NOR: "nor",
        ORI: "ori",
        PAN: "pan",
        POL: "pol",
        POR: "por",
        PUS: "pus",
        RON: "ron",
        RUS: "rus",
        SAN: "san",
        SIN: "sin",
        SLK: "slk",
        SLV: "slv",
        SPA: "spa",
        SPA_OLD: "spa_old",
        SQI: "sqi",
        SRP: "srp",
        SRP_LATN: "srp_latn",
        SWA: "swa",
        SWE: "swe",
        SYR: "syr",
        TAM: "tam",
        TEL: "tel",
        TGK: "tgk",
        TGL: "tgl",
        THA: "tha",
        TIR: "tir",
        TUR: "tur",
        UIG: "uig",
        UKR: "ukr",
        URD: "urd",
        UZB: "uzb",
        UZB_CYRL: "uzb_cyrl",
        VIE: "vie",
        YID: "yid"
      };
    }
  });

  // node_modules/tesseract.js/src/constants/PSM.js
  var require_PSM = __commonJS({
    "node_modules/tesseract.js/src/constants/PSM.js"(exports, module) {
      "use strict";
      module.exports = {
        OSD_ONLY: "0",
        AUTO_OSD: "1",
        AUTO_ONLY: "2",
        AUTO: "3",
        SINGLE_COLUMN: "4",
        SINGLE_BLOCK_VERT_TEXT: "5",
        SINGLE_BLOCK: "6",
        SINGLE_LINE: "7",
        SINGLE_WORD: "8",
        CIRCLE_WORD: "9",
        SINGLE_CHAR: "10",
        SPARSE_TEXT: "11",
        SPARSE_TEXT_OSD: "12",
        RAW_LINE: "13"
      };
    }
  });

  // node_modules/tesseract.js/src/index.js
  var require_src = __commonJS({
    "node_modules/tesseract.js/src/index.js"(exports, module) {
      "use strict";
      require_runtime();
      var createScheduler = require_createScheduler(), createWorker2 = require_createWorker(), Tesseract = require_Tesseract(), languages = require_languages(), OEM2 = require_OEM(), PSM = require_PSM(), { setLogging } = require_log();
      module.exports = {
        languages,
        OEM: OEM2,
        PSM,
        createScheduler,
        createWorker: createWorker2,
        setLogging,
        ...Tesseract
      };
    }
  });

  // src/pwa/ocr.ts
  var import_tesseract = __toESM(require_src(), 1);

  // src/extension/content/image-text.ts
  var words = (s) => s.toLowerCase().normalize("NFKC").match(/[\p{L}\p{N}]{3,}/gu) ?? [];
  function imageOnlyLines(lines, pageTexts) {
    let page = new Set(pageTexts.flatMap(words));
    return lines.filter((line) => {
      let w = words(line);
      return w.length < 2 ? !1 : w.filter((x) => page.has(x)).length / w.length < 0.7;
    });
  }

  // src/pwa/ocr-text.ts
  function cleanOcrLines(lines) {
    let out = [];
    for (let raw of lines) {
      let line = raw.replace(/\s+/gu, " ").trim();
      if (!line || /^\d{1,2}[.:]\d{2}(?:\s*[✓√]+)?$/u.test(line) || (line.match(new RegExp("\\p{L}", "gu")) ?? []).length < 2) continue;
      let prev = out[out.length - 1];
      prev !== void 0 && !/[.!?:;)\]]$/u.test(prev) && new RegExp("^\\p{Ll}", "u").test(line) ? out[out.length - 1] = `${prev} ${line}` : out.push(line);
    }
    return out;
  }
  function mergeOcrPasses(first, second) {
    let a = cleanOcrLines(first.split(`
`));
    return [...a, ...imageOnlyLines(cleanOcrLines(second.split(`
`)), a)];
  }

  // src/pwa/ocr.ts
  var BASE = new URL(".", document.currentScript.src).href, worker = null, onProgress;
  function getWorker() {
    return worker ??= (0, import_tesseract.createWorker)(["ind", "eng"], import_tesseract.OEM.LSTM_ONLY, {
      workerPath: `${BASE}worker.min.js`,
      corePath: `${BASE}core/`,
      langPath: `${BASE}lang/`,
      workerBlobURL: !1,
      cacheMethod: "none",
      gzip: !0,
      logger: (m) => onProgress?.(m.status === "recognizing text" ? 0.5 + m.progress / 2 : m.progress / 2)
    }), worker;
  }
  var api = {
    async recognize(image, progress) {
      onProgress = progress;
      try {
        let w = await getWorker();
        await w.setParameters({ thresholding_method: "0" });
        let first = (await w.recognize(image)).data.text;
        await w.setParameters({ thresholding_method: "1" });
        let second = (await w.recognize(image)).data.text;
        return mergeOcrPasses(first, second);
      } finally {
        onProgress = void 0;
      }
    }
  };
  window.__vtOcr = api;
})();
