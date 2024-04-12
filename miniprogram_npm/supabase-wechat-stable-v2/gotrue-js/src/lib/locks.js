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
Object.defineProperty(exports, "__esModule", { value: true });
exports.navigatorLock = exports.NavigatorLockAcquireTimeoutError = exports.LockAcquireTimeoutError = exports.internals = void 0;
const helpers_1 = require("./helpers");
/**
 * @experimental
 */
exports.internals = {
    /**
     * @experimental
     */
    debug: !!(globalThis &&
        (0, helpers_1.supportsLocalStorage)() &&
        globalThis.localStorage &&
        globalThis.localStorage.getItem('supabase.gotrue-js.locks.debug') === 'true'),
};
class LockAcquireTimeoutError extends Error {
    constructor(message) {
        super(message);
        this.isAcquireTimeout = true;
    }
}
exports.LockAcquireTimeoutError = LockAcquireTimeoutError;
class NavigatorLockAcquireTimeoutError extends LockAcquireTimeoutError {
}
exports.NavigatorLockAcquireTimeoutError = NavigatorLockAcquireTimeoutError;
/**
 * Implements a global exclusive lock using the Navigator LockManager API. It
 * is available on all browsers released after 2022-03-15 with Safari being the
 * last one to release support. If the API is not available, this function will
 * throw. Make sure you check availablility before configuring {@link
 * GoTrueClient}.
 *
 * You can turn on debugging by setting the `supabase.gotrue-js.locks.debug`
 * local storage item to `true`.
 *
 * Internals:
 *
 * Since the LockManager API does not preserve stack traces for the async
 * function passed in the `request` method, a trick is used where acquiring the
 * lock releases a previously started promise to run the operation in the `fn`
 * function. The lock waits for that promise to finish (with or without error),
 * while the function will finally wait for the result anyway.
 *
 * @experimental
 *
 * @param name Name of the lock to be acquired.
 * @param acquireTimeout If negative, no timeout. If 0 an error is thrown if
 *                       the lock can't be acquired without waiting. If positive, the lock acquire
 *                       will time out after so many milliseconds. An error is
 *                       a timeout if it has `isAcquireTimeout` set to true.
 * @param fn The operation to run once the lock is acquired.
 */
function navigatorLock(name, acquireTimeout, fn) {
    return __awaiter(this, void 0, void 0, function* () {
        if (exports.internals.debug) {
            console.log('@supabase/gotrue-js: navigatorLock: acquire lock', name, acquireTimeout);
        }
        const abortController = new globalThis.AbortController();
        if (acquireTimeout > 0) {
            setTimeout(() => {
                abortController.abort();
                if (exports.internals.debug) {
                    console.log('@supabase/gotrue-js: navigatorLock acquire timed out', name);
                }
            }, acquireTimeout);
        }
        // MDN article: https://developer.mozilla.org/en-US/docs/Web/API/LockManager/request
        return yield globalThis.navigator.locks.request(name, acquireTimeout === 0
            ? {
                mode: 'exclusive',
                ifAvailable: true,
            }
            : {
                mode: 'exclusive',
                signal: abortController.signal,
            }, (lock) => __awaiter(this, void 0, void 0, function* () {
            if (lock) {
                if (exports.internals.debug) {
                    console.log('@supabase/gotrue-js: navigatorLock: acquired', name, lock.name);
                }
                try {
                    return yield fn();
                }
                finally {
                    if (exports.internals.debug) {
                        console.log('@supabase/gotrue-js: navigatorLock: released', name, lock.name);
                    }
                }
            }
            else {
                if (acquireTimeout === 0) {
                    if (exports.internals.debug) {
                        console.log('@supabase/gotrue-js: navigatorLock: not immediately available', name);
                    }
                    throw new NavigatorLockAcquireTimeoutError(`Acquiring an exclusive Navigator LockManager lock "${name}" immediately failed`);
                }
                else {
                    if (exports.internals.debug) {
                        try {
                            const result = yield globalThis.navigator.locks.query();
                            console.log('@supabase/gotrue-js: Navigator LockManager state', JSON.stringify(result, null, '  '));
                        }
                        catch (e) {
                            console.warn('@supabase/gotrue-js: Error when querying Navigator LockManager state', e);
                        }
                    }
                    // Browser is not following the Navigator LockManager spec, it
                    // returned a null lock when we didn't use ifAvailable. So we can
                    // pretend the lock is acquired in the name of backward compatibility
                    // and user experience and just run the function.
                    console.warn('@supabase/gotrue-js: Navigator LockManager returned a null lock when using #request without ifAvailable set to true, it appears this browser is not following the LockManager spec https://developer.mozilla.org/en-US/docs/Web/API/LockManager/request');
                    return yield fn();
                }
            }
        }));
    });
}
exports.navigatorLock = navigatorLock;
//# sourceMappingURL=locks.js.map