var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
class H {
  static __wrap(A) {
    const I = Object.create(H.prototype);
    return I.__wbg_ptr = A, z.register(I, I.__wbg_ptr, I), I;
  }
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, z.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    B.__wbg_clipboarddata_free(A, 0);
  }
  /**
   * @param {string} mime_type
   * @param {Uint8Array} binary
   */
  addBinary(A, I) {
    const g = o(A, B.__wbindgen_malloc, B.__wbindgen_realloc), C = N, E = _(I, B.__wbindgen_malloc), D = N;
    B.clipboarddata_addBinary(this.__wbg_ptr, g, C, E, D);
  }
  /**
   * @param {string} mime_type
   * @param {string} text
   */
  addText(A, I) {
    const g = o(A, B.__wbindgen_malloc, B.__wbindgen_realloc), C = N, E = o(I, B.__wbindgen_malloc, B.__wbindgen_realloc), D = N;
    B.clipboarddata_addText(this.__wbg_ptr, g, C, E, D);
  }
  constructor() {
    const A = B.clipboarddata_create();
    return this.__wbg_ptr = A, z.register(this, this.__wbg_ptr, this), this;
  }
  /**
   * @returns {boolean}
   */
  isEmpty() {
    return B.clipboarddata_isEmpty(this.__wbg_ptr) !== 0;
  }
  /**
   * @returns {ClipboardItem[]}
   */
  items() {
    const A = B.clipboarddata_items(this.__wbg_ptr);
    var I = XA(A[0], A[1]).slice();
    return B.__wbindgen_free(A[0], A[1] * 4, 4), I;
  }
}
Symbol.dispose && (H.prototype[Symbol.dispose] = H.prototype.free);
class b {
  static __wrap(A) {
    const I = Object.create(b.prototype);
    return I.__wbg_ptr = A, IA.register(I, I.__wbg_ptr, I), I;
  }
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, IA.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    B.__wbg_clipboarditem_free(A, 0);
  }
  /**
   * @returns {string}
   */
  mimeType() {
    let A, I;
    try {
      const g = B.clipboarditem_mimeType(this.__wbg_ptr);
      return A = g[0], I = g[1], k(g[0], g[1]);
    } finally {
      B.__wbindgen_free(A, I, 1);
    }
  }
  /**
   * @returns {any}
   */
  value() {
    return B.clipboarditem_value(this.__wbg_ptr);
  }
}
Symbol.dispose && (b.prototype[Symbol.dispose] = b.prototype.free);
class a {
  static __wrap(A) {
    const I = Object.create(a.prototype);
    return I.__wbg_ptr = A, n.register(I, I.__wbg_ptr, I), I;
  }
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, n.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    B.__wbg_desktopsize_free(A, 0);
  }
  /**
   * @param {number} width
   * @param {number} height
   */
  constructor(A, I) {
    const g = B.desktopsize_create(A, I);
    return this.__wbg_ptr = g, n.register(this, this.__wbg_ptr, this), this;
  }
  /**
   * @returns {number}
   */
  get height() {
    return B.__wbg_get_desktopsize_height(this.__wbg_ptr);
  }
  /**
   * @returns {number}
   */
  get width() {
    return B.__wbg_get_desktopsize_width(this.__wbg_ptr);
  }
  /**
   * @param {number} arg0
   */
  set height(A) {
    B.__wbg_set_desktopsize_height(this.__wbg_ptr, A);
  }
  /**
   * @param {number} arg0
   */
  set width(A) {
    B.__wbg_set_desktopsize_width(this.__wbg_ptr, A);
  }
}
Symbol.dispose && (a.prototype[Symbol.dispose] = a.prototype.free);
class U {
  static __wrap(A) {
    const I = Object.create(U.prototype);
    return I.__wbg_ptr = A, gA.register(I, I.__wbg_ptr, I), I;
  }
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, gA.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    B.__wbg_deviceevent_free(A, 0);
  }
  /**
   * @param {number} scancode
   * @returns {DeviceEvent}
   */
  static keyPressed(A) {
    const I = B.deviceevent_keyPressed(A);
    return U.__wrap(I);
  }
  /**
   * @param {number} scancode
   * @returns {DeviceEvent}
   */
  static keyReleased(A) {
    const I = B.deviceevent_keyReleased(A);
    return U.__wrap(I);
  }
  /**
   * @param {number} button
   * @returns {DeviceEvent}
   */
  static mouseButtonPressed(A) {
    const I = B.deviceevent_mouseButtonPressed(A);
    return U.__wrap(I);
  }
  /**
   * @param {number} button
   * @returns {DeviceEvent}
   */
  static mouseButtonReleased(A) {
    const I = B.deviceevent_mouseButtonReleased(A);
    return U.__wrap(I);
  }
  /**
   * @param {number} x
   * @param {number} y
   * @returns {DeviceEvent}
   */
  static mouseMove(A, I) {
    const g = B.deviceevent_mouseMove(A, I);
    return U.__wrap(g);
  }
  /**
   * @param {string} unicode
   * @returns {DeviceEvent}
   */
  static unicodePressed(A) {
    const I = A.codePointAt(0);
    GA(I);
    const g = B.deviceevent_unicodePressed(I);
    return U.__wrap(g);
  }
  /**
   * @param {string} unicode
   * @returns {DeviceEvent}
   */
  static unicodeReleased(A) {
    const I = A.codePointAt(0);
    GA(I);
    const g = B.deviceevent_unicodeReleased(I);
    return U.__wrap(g);
  }
  /**
   * @param {boolean} vertical
   * @param {number} rotation_amount
   * @param {RotationUnit} rotation_unit
   * @returns {DeviceEvent}
   */
  static wheelRotations(A, I, g) {
    const C = B.deviceevent_wheelRotations(A, I, g);
    return U.__wrap(C);
  }
}
Symbol.dispose && (U.prototype[Symbol.dispose] = U.prototype.free);
class F {
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, QA.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    B.__wbg_extension_free(A, 0);
  }
  /**
   * @param {string} ident
   * @param {any} value
   */
  constructor(A, I) {
    const g = o(A, B.__wbindgen_malloc, B.__wbindgen_realloc), C = N, E = B.extension_create(g, C, I);
    return this.__wbg_ptr = E, QA.register(this, this.__wbg_ptr, this), this;
  }
}
Symbol.dispose && (F.prototype[Symbol.dispose] = F.prototype.free);
class r {
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, CA.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    B.__wbg_inputtransaction_free(A, 0);
  }
  /**
   * @param {DeviceEvent} event
   */
  addEvent(A) {
    Z(A, U);
    var I = A.__destroy_into_raw();
    B.inputtransaction_addEvent(this.__wbg_ptr, I);
  }
  constructor() {
    const A = B.inputtransaction_create();
    return this.__wbg_ptr = A, CA.register(this, this.__wbg_ptr, this), this;
  }
}
Symbol.dispose && (r.prototype[Symbol.dispose] = r.prototype.free);
class x {
  static __wrap(A) {
    const I = Object.create(x.prototype);
    return I.__wbg_ptr = A, BA.register(I, I.__wbg_ptr, I), I;
  }
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, BA.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    B.__wbg_ironerror_free(A, 0);
  }
  /**
   * @returns {string}
   */
  backtrace() {
    let A, I;
    try {
      const g = B.ironerror_backtrace(this.__wbg_ptr);
      return A = g[0], I = g[1], k(g[0], g[1]);
    } finally {
      B.__wbindgen_free(A, I, 1);
    }
  }
  /**
   * @returns {IronErrorKind}
   */
  kind() {
    return B.ironerror_kind(this.__wbg_ptr);
  }
  /**
   * @returns {RDCleanPathDetails | undefined}
   */
  rdcleanpathDetails() {
    const A = B.ironerror_rdcleanpathDetails(this.__wbg_ptr);
    return A === 0 ? void 0 : f.__wrap(A);
  }
}
Symbol.dispose && (x.prototype[Symbol.dispose] = x.prototype.free);
class f {
  static __wrap(A) {
    const I = Object.create(f.prototype);
    return I.__wbg_ptr = A, EA.register(I, I.__wbg_ptr, I), I;
  }
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, EA.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    B.__wbg_rdcleanpathdetails_free(A, 0);
  }
  /**
   * HTTP status code if the error originated from an HTTP response.
   *
   * Common values:
   * - 403: Forbidden (e.g., deleted VNET, insufficient permissions)
   * - 404: Not Found
   * - 500: Internal Server Error
   * - 502: Bad Gateway
   * - 503: Service Unavailable
   * @returns {number | undefined}
   */
  get httpStatusCode() {
    const A = B.rdcleanpathdetails_httpStatusCode(this.__wbg_ptr);
    return A === 16777215 ? void 0 : A;
  }
  /**
   * TLS alert code if the error occurred during TLS handshake.
   *
   * Common values:
   * - 40: Handshake failure
   * - 42: Bad certificate
   * - 45: Certificate expired
   * - 48: Unknown CA
   * - 112: Unrecognized name
   * @returns {number | undefined}
   */
  get tlsAlertCode() {
    const A = B.rdcleanpathdetails_tlsAlertCode(this.__wbg_ptr);
    return A === 16777215 ? void 0 : A;
  }
  /**
   * Windows Socket API (WSA) error code.
   *
   * Common values:
   * - 10013: Permission denied (WSAEACCES) - often indicates deleted/invalid VNET
   * - 10060: Connection timed out (WSAETIMEDOUT)
   * - 10061: Connection refused (WSAECONNREFUSED)
   * - 10051: Network is unreachable (WSAENETUNREACH)
   * - 10065: No route to host (WSAEHOSTUNREACH)
   * @returns {number | undefined}
   */
  get wsaErrorCode() {
    const A = B.rdcleanpathdetails_wsaErrorCode(this.__wbg_ptr);
    return A === 16777215 ? void 0 : A;
  }
}
Symbol.dispose && (f.prototype[Symbol.dispose] = f.prototype.free);
class AA {
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, DA.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    B.__wbg_rdpfile_free(A, 0);
  }
  constructor() {
    const A = B.rdpfile_create();
    return this.__wbg_ptr = A, DA.register(this, this.__wbg_ptr, this), this;
  }
  /**
   * @param {string} key
   * @returns {number | undefined}
   */
  getInt(A) {
    const I = o(A, B.__wbindgen_malloc, B.__wbindgen_realloc), g = N, C = B.rdpfile_getInt(this.__wbg_ptr, I, g);
    return C === Number.MAX_SAFE_INTEGER ? void 0 : C;
  }
  /**
   * @param {string} key
   * @returns {string | undefined}
   */
  getStr(A) {
    const I = o(A, B.__wbindgen_malloc, B.__wbindgen_realloc), g = N, C = B.rdpfile_getStr(this.__wbg_ptr, I, g);
    let E;
    return C[0] !== 0 && (E = k(C[0], C[1]).slice(), B.__wbindgen_free(C[0], C[1] * 1, 1)), E;
  }
  /**
   * @param {string} key
   * @param {number} value
   */
  insertInt(A, I) {
    const g = o(A, B.__wbindgen_malloc, B.__wbindgen_realloc), C = N;
    B.rdpfile_insertInt(this.__wbg_ptr, g, C, I);
  }
  /**
   * @param {string} key
   * @param {string} value
   */
  insertStr(A, I) {
    const g = o(A, B.__wbindgen_malloc, B.__wbindgen_realloc), C = N, E = o(I, B.__wbindgen_malloc, B.__wbindgen_realloc), D = N;
    B.rdpfile_insertStr(this.__wbg_ptr, g, C, E, D);
  }
  /**
   * @param {string} config
   */
  parse(A) {
    const I = o(A, B.__wbindgen_malloc, B.__wbindgen_realloc), g = N;
    B.rdpfile_parse(this.__wbg_ptr, I, g);
  }
  /**
   * @returns {string}
   */
  write() {
    let A, I;
    try {
      const g = B.rdpfile_write(this.__wbg_ptr);
      return A = g[0], I = g[1], k(g[0], g[1]);
    } finally {
      B.__wbindgen_free(A, I, 1);
    }
  }
}
Symbol.dispose && (AA.prototype[Symbol.dispose] = AA.prototype.free);
class P {
  static __wrap(A) {
    const I = Object.create(P.prototype);
    return I.__wbg_ptr = A, wA.register(I, I.__wbg_ptr, I), I;
  }
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, wA.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    B.__wbg_session_free(A, 0);
  }
  /**
   * @param {InputTransaction} transaction
   */
  applyInputs(A) {
    Z(A, r);
    var I = A.__destroy_into_raw();
    const g = B.session_applyInputs(this.__wbg_ptr, I);
    if (g[1])
      throw c(g[0]);
  }
  /**
   * @returns {DesktopSize}
   */
  desktopSize() {
    const A = B.session_desktopSize(this.__wbg_ptr);
    return a.__wrap(A);
  }
  /**
   * @param {Extension} ext
   * @returns {any}
   */
  invokeExtension(A) {
    Z(A, F);
    var I = A.__destroy_into_raw();
    const g = B.session_invokeExtension(this.__wbg_ptr, I);
    if (g[2])
      throw c(g[1]);
    return c(g[0]);
  }
  /**
   * @param {ClipboardData} content
   * @returns {Promise<void>}
   */
  onClipboardPaste(A) {
    return Z(A, H), B.session_onClipboardPaste(this.__wbg_ptr, A.__wbg_ptr);
  }
  refresh() {
    B.session_refresh(this.__wbg_ptr);
  }
  releaseAllInputs() {
    const A = B.session_releaseAllInputs(this.__wbg_ptr);
    if (A[1])
      throw c(A[0]);
  }
  /**
   * @param {number} width
   * @param {number} height
   * @param {number | null} [scale_factor]
   * @param {number | null} [physical_width]
   * @param {number | null} [physical_height]
   */
  resize(A, I, g, C, E) {
    B.session_resize(this.__wbg_ptr, A, I, h(g) ? Number.MAX_SAFE_INTEGER : g >>> 0, h(C) ? Number.MAX_SAFE_INTEGER : C >>> 0, h(E) ? Number.MAX_SAFE_INTEGER : E >>> 0);
  }
  /**
   * @returns {Promise<SessionTerminationInfo>}
   */
  run() {
    return B.session_run(this.__wbg_ptr);
  }
  shutdown() {
    const A = B.session_shutdown(this.__wbg_ptr);
    if (A[1])
      throw c(A[0]);
  }
  /**
   * @returns {boolean}
   */
  supportsUnicodeKeyboardShortcuts() {
    return B.session_supportsUnicodeKeyboardShortcuts(this.__wbg_ptr) !== 0;
  }
  /**
   * @param {boolean} scroll_lock
   * @param {boolean} num_lock
   * @param {boolean} caps_lock
   * @param {boolean} kana_lock
   */
  synchronizeLockKeys(A, I, g, C) {
    const E = B.session_synchronizeLockKeys(this.__wbg_ptr, A, I, g, C);
    if (E[1])
      throw c(E[0]);
  }
}
Symbol.dispose && (P.prototype[Symbol.dispose] = P.prototype.free);
class M {
  static __wrap(A) {
    const I = Object.create(M.prototype);
    return I.__wbg_ptr = A, u.register(I, I.__wbg_ptr, I), I;
  }
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, u.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    B.__wbg_sessionbuilder_free(A, 0);
  }
  /**
   * @param {string} token
   * @returns {SessionBuilder}
   */
  authToken(A) {
    const I = o(A, B.__wbindgen_malloc, B.__wbindgen_realloc), g = N, C = B.sessionbuilder_authToken(this.__wbg_ptr, I, g);
    return M.__wrap(C);
  }
  /**
   * @param {Function} callback
   * @returns {SessionBuilder}
   */
  canvasResizedCallback(A) {
    const I = B.sessionbuilder_canvasResizedCallback(this.__wbg_ptr, A);
    return M.__wrap(I);
  }
  /**
   * @returns {Promise<Session>}
   */
  connect() {
    return B.sessionbuilder_connect(this.__wbg_ptr);
  }
  constructor() {
    const A = B.sessionbuilder_create();
    return this.__wbg_ptr = A, u.register(this, this.__wbg_ptr, this), this;
  }
  /**
   * @param {DesktopSize} desktop_size
   * @returns {SessionBuilder}
   */
  desktopSize(A) {
    Z(A, a);
    var I = A.__destroy_into_raw();
    const g = B.sessionbuilder_desktopSize(this.__wbg_ptr, I);
    return M.__wrap(g);
  }
  /**
   * @param {string} destination
   * @returns {SessionBuilder}
   */
  destination(A) {
    const I = o(A, B.__wbindgen_malloc, B.__wbindgen_realloc), g = N, C = B.sessionbuilder_destination(this.__wbg_ptr, I, g);
    return M.__wrap(C);
  }
  /**
   * @param {Extension} ext
   * @returns {SessionBuilder}
   */
  extension(A) {
    Z(A, F);
    var I = A.__destroy_into_raw();
    const g = B.sessionbuilder_extension(this.__wbg_ptr, I);
    return M.__wrap(g);
  }
  /**
   * @param {Function} callback
   * @returns {SessionBuilder}
   */
  forceClipboardUpdateCallback(A) {
    const I = B.sessionbuilder_forceClipboardUpdateCallback(this.__wbg_ptr, A);
    return M.__wrap(I);
  }
  /**
   * @param {string} password
   * @returns {SessionBuilder}
   */
  password(A) {
    const I = o(A, B.__wbindgen_malloc, B.__wbindgen_realloc), g = N, C = B.sessionbuilder_password(this.__wbg_ptr, I, g);
    return M.__wrap(C);
  }
  /**
   * @param {string} address
   * @returns {SessionBuilder}
   */
  proxyAddress(A) {
    const I = o(A, B.__wbindgen_malloc, B.__wbindgen_realloc), g = N, C = B.sessionbuilder_proxyAddress(this.__wbg_ptr, I, g);
    return M.__wrap(C);
  }
  /**
   * @param {Function} callback
   * @returns {SessionBuilder}
   */
  remoteClipboardChangedCallback(A) {
    const I = B.sessionbuilder_remoteClipboardChangedCallback(this.__wbg_ptr, A);
    return M.__wrap(I);
  }
  /**
   * @param {HTMLCanvasElement} canvas
   * @returns {SessionBuilder}
   */
  renderCanvas(A) {
    const I = B.sessionbuilder_renderCanvas(this.__wbg_ptr, A);
    return M.__wrap(I);
  }
  /**
   * @param {string} server_domain
   * @returns {SessionBuilder}
   */
  serverDomain(A) {
    const I = o(A, B.__wbindgen_malloc, B.__wbindgen_realloc), g = N, C = B.sessionbuilder_serverDomain(this.__wbg_ptr, I, g);
    return M.__wrap(C);
  }
  /**
   * @param {Function} callback
   * @returns {SessionBuilder}
   */
  setCursorStyleCallback(A) {
    const I = B.sessionbuilder_setCursorStyleCallback(this.__wbg_ptr, A);
    return M.__wrap(I);
  }
  /**
   * @param {any} context
   * @returns {SessionBuilder}
   */
  setCursorStyleCallbackContext(A) {
    const I = B.sessionbuilder_setCursorStyleCallbackContext(this.__wbg_ptr, A);
    return M.__wrap(I);
  }
  /**
   * @param {string} username
   * @returns {SessionBuilder}
   */
  username(A) {
    const I = o(A, B.__wbindgen_malloc, B.__wbindgen_realloc), g = N, C = B.sessionbuilder_username(this.__wbg_ptr, I, g);
    return M.__wrap(C);
  }
}
Symbol.dispose && (M.prototype[Symbol.dispose] = M.prototype.free);
class m {
  static __wrap(A) {
    const I = Object.create(m.prototype);
    return I.__wbg_ptr = A, iA.register(I, I.__wbg_ptr, I), I;
  }
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, iA.unregister(this), A;
  }
  free() {
    const A = this.__destroy_into_raw();
    B.__wbg_sessionterminationinfo_free(A, 0);
  }
  /**
   * @returns {string}
   */
  reason() {
    let A, I;
    try {
      const g = B.sessionterminationinfo_reason(this.__wbg_ptr);
      return A = g[0], I = g[1], k(g[0], g[1]);
    } finally {
      B.__wbindgen_free(A, I, 1);
    }
  }
}
Symbol.dispose && (m.prototype[Symbol.dispose] = m.prototype.free);
function kA(Q, A) {
  B.acknowledge_egfx_presented(Q, A);
}
function yA(Q, A, I, g, C, E, D, w) {
  const i = _(w, B.__wbindgen_malloc), y = N;
  B.apply_egfx_rgba(Q, A, I, g, C, E, D, i, y);
}
function RA() {
  B.begin_egfx_resize_capture();
}
function MA() {
  return B.egfx_diag_error_count() >>> 0;
}
function YA(Q, A) {
  const I = _(A, B.__wbindgen_malloc), g = N;
  B.push_udp_payload(Q, I, g);
}
function UA(Q) {
  B.release_gfx_session(Q);
}
function hA(Q, A) {
  B.set_avc420_webcodecs_callback(Q, A);
}
function JA(Q, A) {
  B.set_egfx_avc_thin_client(Q, A);
}
function SA(Q, A) {
  B.set_egfx_caps_callback(Q, A);
}
function KA(Q, A) {
  B.set_egfx_reset_callback(Q, A);
}
function LA(Q, A) {
  B.set_rdpsnd_wave_callback(Q, A);
}
function sA(Q, A) {
  B.set_udp_open_callback(Q, A);
}
function cA(Q, A) {
  B.set_udp_send_callback(Q, A);
}
function HA(Q) {
  const A = o(Q, B.__wbindgen_malloc, B.__wbindgen_realloc), I = N;
  B.setup(A, I);
}
function aA() {
  return B.take_egfx_resize_capture();
}
function qA() {
  return {
    __proto__: null,
    "./ironrdp_web_bg.js": {
      __proto__: null,
      __wbg___wbindgen_boolean_get_fa956cfa2d1bd751: function(A) {
        const I = A, g = typeof I == "boolean" ? I : void 0;
        return h(g) ? 16777215 : g ? 1 : 0;
      },
      __wbg___wbindgen_debug_string_c25d447a39f5578f: function(A, I) {
        const g = e(I), C = o(g, B.__wbindgen_malloc, B.__wbindgen_realloc), E = N;
        R().setInt32(A + 4, E, true), R().setInt32(A + 0, C, true);
      },
      __wbg___wbindgen_is_falsy_a6dfe792ff282f10: function(A) {
        return !A;
      },
      __wbg___wbindgen_is_function_1ff95bcc5517c252: function(A) {
        return typeof A == "function";
      },
      __wbg___wbindgen_is_null_ea9085d691f535d3: function(A) {
        return A === null;
      },
      __wbg___wbindgen_is_string_ea5e6cc2e4141dfe: function(A) {
        return typeof A == "string";
      },
      __wbg___wbindgen_is_undefined_c05833b95a3cf397: function(A) {
        return A === void 0;
      },
      __wbg___wbindgen_number_get_394265ed1e1b84ee: function(A, I) {
        const g = I, C = typeof g == "number" ? g : void 0;
        R().setFloat64(A + 8, h(C) ? 0 : C, true), R().setInt32(A + 0, !h(C), true);
      },
      __wbg___wbindgen_string_get_b0ca35b86a603356: function(A, I) {
        const g = I, C = typeof g == "string" ? g : void 0;
        var E = h(C) ? 0 : o(C, B.__wbindgen_malloc, B.__wbindgen_realloc), D = N;
        R().setInt32(A + 4, D, true), R().setInt32(A + 0, E, true);
      },
      __wbg___wbindgen_throw_344f42d3211c4765: function(A, I) {
        throw new Error(k(A, I));
      },
      __wbg__wbg_cb_unref_fffb441def202758: function(A) {
        A._wbg_cb_unref();
      },
      __wbg_addEventListener_520e749bbae24529: function() {
        return G(function(A, I, g, C, E) {
          A.addEventListener(k(I, g), C, E);
        }, arguments);
      },
      __wbg_addEventListener_d85450ee1320c989: function() {
        return G(function(A, I, g, C) {
          A.addEventListener(k(I, g), C);
        }, arguments);
      },
      __wbg_apply_3ac86a26fdb56c05: function() {
        return G(function(A, I, g) {
          return A.apply(I, g);
        }, arguments);
      },
      __wbg_arrayBuffer_3b637f0fa65c5351: function() {
        return G(function(A) {
          return A.arrayBuffer();
        }, arguments);
      },
      __wbg_call_8a2dd23819f8a60a: function() {
        return G(function(A, I) {
          return A.call(I);
        }, arguments);
      },
      __wbg_call_a6e5c5dce5018821: function() {
        return G(function(A, I, g) {
          return A.call(I, g);
        }, arguments);
      },
      __wbg_call_e3b662382210db98: function() {
        return G(function(A, I, g, C) {
          return A.call(I, g, C);
        }, arguments);
      },
      __wbg_clearInterval_26ba580547547579: function(A) {
        return clearInterval(A);
      },
      __wbg_clearTimeout_3629d6209dfcc46e: function(A) {
        return clearTimeout(A);
      },
      __wbg_clipboarddata_new: function(A) {
        return H.__wrap(A);
      },
      __wbg_clipboarditem_new: function(A) {
        return b.__wrap(A);
      },
      __wbg_close_c65ca0257e895318: function() {
        return G(function(A) {
          A.close();
        }, arguments);
      },
      __wbg_code_1fc52b4142a112ac: function(A) {
        return A.code;
      },
      __wbg_data_328de4280640da92: function(A) {
        return A.data;
      },
      __wbg_debug_87fd9b1a625b7efb: function(A) {
        console.debug(A);
      },
      __wbg_dispatchEvent_ca78eaf3d469bc25: function() {
        return G(function(A, I) {
          return A.dispatchEvent(I);
        }, arguments);
      },
      __wbg_error_744744ff0c9861e6: function(A) {
        console.error(A);
      },
      __wbg_error_a6fa202b58aa1cd3: function(A, I) {
        let g, C;
        try {
          g = A, C = I, console.error(k(A, I));
        } finally {
          B.__wbindgen_free(g, C, 1);
        }
      },
      __wbg_fetch_9b478faef8cda538: function(A) {
        return fetch(A);
      },
      __wbg_from_13e323c65fc8f464: function(A) {
        return Array.from(A);
      },
      __wbg_getContext_e79ddf6a9cb3cc76: function() {
        return G(function(A, I, g) {
          const C = A.getContext(k(I, g));
          return h(C) ? 0 : L(C);
        }, arguments);
      },
      __wbg_getRandomValues_3f44b700395062e5: function() {
        return G(function(A, I) {
          globalThis.crypto.getRandomValues(q(A, I));
        }, arguments);
      },
      __wbg_getRandomValues_bf16787eede473f5: function() {
        return G(function(A, I) {
          globalThis.crypto.getRandomValues(q(A, I));
        }, arguments);
      },
      __wbg_getRandomValues_cc7f052a444bb2ce: function() {
        return G(function(A, I) {
          globalThis.crypto.getRandomValues(q(A, I));
        }, arguments);
      },
      __wbg_getTime_d6f070c088c9b5ed: function(A) {
        return A.getTime();
      },
      __wbg_get_507a50627bffa49b: function(A, I) {
        return A[I >>> 0];
      },
      __wbg_get_78f252d074a84d0b: function() {
        return G(function(A, I) {
          return Reflect.get(A, I);
        }, arguments);
      },
      __wbg_height_6eec812c213259a1: function(A) {
        return A.height;
      },
      __wbg_info_eadbe775a8e2e9eb: function(A) {
        console.info(A);
      },
      __wbg_instanceof_ArrayBuffer_4480b9e0068a8adb: function(A) {
        let I;
        try {
          I = A instanceof ArrayBuffer;
        } catch {
          I = false;
        }
        return I;
      },
      __wbg_instanceof_CanvasRenderingContext2d_2284b703b7023dcc: function(A) {
        let I;
        try {
          I = A instanceof CanvasRenderingContext2D;
        } catch {
          I = false;
        }
        return I;
      },
      __wbg_instanceof_Error_1fdac9f13a8181ba: function(A) {
        let I;
        try {
          I = A instanceof Error;
        } catch {
          I = false;
        }
        return I;
      },
      __wbg_instanceof_Object_33f20e6f12439f3e: function(A) {
        let I;
        try {
          I = A instanceof Object;
        } catch {
          I = false;
        }
        return I;
      },
      __wbg_instanceof_Promise_4cb210c0b8f8c959: function(A) {
        let I;
        try {
          I = A instanceof Promise;
        } catch {
          I = false;
        }
        return I;
      },
      __wbg_instanceof_Response_c8b64b2256f01bec: function(A) {
        let I;
        try {
          I = A instanceof Response;
        } catch {
          I = false;
        }
        return I;
      },
      __wbg_instanceof_Window_05ba1ee4f6781663: function(A) {
        let I;
        try {
          I = A instanceof Window;
        } catch {
          I = false;
        }
        return I;
      },
      __wbg_ironerror_new: function(A) {
        return x.__wrap(A);
      },
      __wbg_length_1f0964f4a5e2c6d8: function(A) {
        return A.length;
      },
      __wbg_length_370319915dc99107: function(A) {
        return A.length;
      },
      __wbg_length_f835a518a2e03647: function(A) {
        return A.length;
      },
      __wbg_message_8326fb1d549bebc5: function(A) {
        return A.message;
      },
      __wbg_name_b0b4809690944614: function(A) {
        return A.name;
      },
      __wbg_navigator_99621db14b3f1099: function(A) {
        return A.navigator;
      },
      __wbg_new_08cb2fa678b17a48: function() {
        return G(function(A, I) {
          return new URL(k(A, I));
        }, arguments);
      },
      __wbg_new_0_3da9e97f24fc69be: function() {
        return /* @__PURE__ */ new Date();
      },
      __wbg_new_0d809930cd1354c6: function() {
        return G(function() {
          return new Headers();
        }, arguments);
      },
      __wbg_new_227d7c05414eb861: function() {
        return new Error();
      },
      __wbg_new_32b398fb48b6d94a: function() {
        return new Array();
      },
      __wbg_new_bf8729ffe10e9ee7: function() {
        return G(function(A, I) {
          return new WebSocket(k(A, I));
        }, arguments);
      },
      __wbg_new_cd45aabdf6073e84: function(A) {
        return new Uint8Array(A);
      },
      __wbg_new_da52cf8fe3429cb2: function() {
        return new Object();
      },
      __wbg_new_f0787df90791d9ba: function() {
        return G(function() {
          return new URLSearchParams();
        }, arguments);
      },
      __wbg_new_f1a34223ddbe3f7d: function() {
        return G(function() {
          return new MessageChannel();
        }, arguments);
      },
      __wbg_new_from_slice_7568ba55b4a7e81f: function(A, I) {
        return new Uint32Array(bA(A, I));
      },
      __wbg_new_from_slice_77cdfb7977362f3c: function(A, I) {
        return new Uint8Array(q(A, I));
      },
      __wbg_new_typed_1824d93f294193e5: function(A, I) {
        try {
          var g = { a: A, b: I }, C = (D, w) => {
            const i = g.a;
            g.a = 0;
            try {
              return WA(i, g.b, D, w);
            } finally {
              g.a = i;
            }
          };
          return new Promise(C);
        } finally {
          g.a = 0;
        }
      },
      __wbg_new_with_event_init_dict_7b62c0f9fb241877: function() {
        return G(function(A, I, g) {
          return new CloseEvent(k(A, I), g);
        }, arguments);
      },
      __wbg_new_with_length_82f839073dfdaa99: function(A) {
        return new Uint16Array(A >>> 0);
      },
      __wbg_new_with_length_e6785c33c8e4cce8: function(A) {
        return new Uint8Array(A >>> 0);
      },
      __wbg_new_with_length_f8cbc3a5b9ff9368: function(A) {
        return new Array(A >>> 0);
      },
      __wbg_new_with_str_54bc0f9c32770e1e: function() {
        return G(function(A, I) {
          return new Request(k(A, I));
        }, arguments);
      },
      __wbg_new_with_str_and_init_d95cbe11ce28e65e: function() {
        return G(function(A, I, g) {
          return new Request(k(A, I), g);
        }, arguments);
      },
      __wbg_new_with_u8_array_sequence_bdda73b0f202f149: function() {
        return G(function(A) {
          return new Blob(A);
        }, arguments);
      },
      __wbg_new_with_u8_clamped_array_and_sh_2767e4741c267d25: function() {
        return G(function(A, I, g, C) {
          return new ImageData(xA(A, I), g >>> 0, C >>> 0);
        }, arguments);
      },
      __wbg_now_390768da5ee9e776: function(A) {
        return A.now();
      },
      __wbg_now_86c0d4ba3fa605b8: function() {
        return Date.now();
      },
      __wbg_now_e7c6795a7f81e10f: function(A) {
        return A.now();
      },
      __wbg_of_85f52f8b6491a7ca: function(A) {
        return Array.of(A);
      },
      __wbg_ok_acc5e3fb89668864: function(A) {
        return A.ok;
      },
      __wbg_performance_3ef602e13d6c3b56: function(A) {
        const I = A.performance;
        return h(I) ? 0 : L(I);
      },
      __wbg_performance_3fcf6e32a7e1ed0a: function(A) {
        return A.performance;
      },
      __wbg_port1_dabba0a56576e47e: function(A) {
        return A.port1;
      },
      __wbg_port2_d05676aee003eedc: function(A) {
        return A.port2;
      },
      __wbg_postMessage_b80f20949a4b4f55: function() {
        return G(function(A, I) {
          A.postMessage(I);
        }, arguments);
      },
      __wbg_prototypesetcall_4770620bbe4688a0: function(A, I, g) {
        Uint8Array.prototype.set.call(q(A, I), g);
      },
      __wbg_push_d2ae3af0c1217ae6: function(A, I) {
        return A.push(I);
      },
      __wbg_putImageData_a4dee11e08ab9ac8: function() {
        return G(function(A, I, g, C) {
          A.putImageData(I, g, C);
        }, arguments);
      },
      __wbg_queueMicrotask_0ab5b2d2393e99b9: function(A) {
        return A.queueMicrotask;
      },
      __wbg_queueMicrotask_6a09b7bc46549209: function(A) {
        queueMicrotask(A);
      },
      __wbg_readyState_50bc38c2a9e83db6: function(A) {
        return A.readyState;
      },
      __wbg_reason_5dc8e429d537d6a9: function(A, I) {
        const g = I.reason, C = o(g, B.__wbindgen_malloc, B.__wbindgen_realloc), E = N;
        R().setInt32(A + 4, E, true), R().setInt32(A + 0, C, true);
      },
      __wbg_removeEventListener_a3f23c70077bdcc1: function() {
        return G(function(A, I, g, C) {
          A.removeEventListener(k(I, g), C);
        }, arguments);
      },
      __wbg_resolve_2191a4dfe481c25b: function(A) {
        return Promise.resolve(A);
      },
      __wbg_search_c905fb82fd20bc6b: function(A, I) {
        const g = I.search, C = o(g, B.__wbindgen_malloc, B.__wbindgen_realloc), E = N;
        R().setInt32(A + 4, E, true), R().setInt32(A + 0, C, true);
      },
      __wbg_send_1733c45567a373ff: function() {
        return G(function(A, I) {
          A.send(I);
        }, arguments);
      },
      __wbg_send_df98dd5ede9b3f4d: function() {
        return G(function(A, I, g) {
          A.send(k(I, g));
        }, arguments);
      },
      __wbg_session_new: function(A) {
        return P.__wrap(A);
      },
      __wbg_sessionterminationinfo_new: function(A) {
        return m.__wrap(A);
      },
      __wbg_setInterval_cbf1c35c6a692d37: function() {
        return G(function(A, I) {
          return setInterval(A, I);
        }, arguments);
      },
      __wbg_setTimeout_56bcdccbad22fd44: function() {
        return G(function(A, I) {
          return setTimeout(A, I);
        }, arguments);
      },
      __wbg_set_0de9c62c23d04ad5: function() {
        return G(function(A, I, g, C, E) {
          A.set(k(I, g), k(C, E));
        }, arguments);
      },
      __wbg_set_4d7dd76f3dae2926: function(A, I, g) {
        A.set(q(I, g));
      },
      __wbg_set_8535240470bf2500: function() {
        return G(function(A, I, g) {
          return Reflect.set(A, I, g);
        }, arguments);
      },
      __wbg_set_8a16b38e4805b298: function(A, I, g) {
        A[I >>> 0] = g;
      },
      __wbg_set_binaryType_a37b086c78ca7c29: function(A, I) {
        A.binaryType = lA[I];
      },
      __wbg_set_body_029f2d171e0a005f: function(A, I) {
        A.body = I;
      },
      __wbg_set_code_9d09aecd77d789f4: function(A, I) {
        A.code = I;
      },
      __wbg_set_fc6febdf1ddac5c2: function(A, I, g) {
        A.set(OA(I, g));
      },
      __wbg_set_headers_9c61d123c3ee1f10: function(A, I) {
        A.headers = I;
      },
      __wbg_set_height_7d9d8f892e6964c6: function(A, I) {
        A.height = I >>> 0;
      },
      __wbg_set_method_5532d59b92d76467: function(A, I, g) {
        A.method = k(I, g);
      },
      __wbg_set_once_51a9fb6b8af8a72b: function(A, I) {
        A.once = I !== 0;
      },
      __wbg_set_onmessage_d511b70365304094: function(A, I) {
        A.onmessage = I;
      },
      __wbg_set_reason_18dc06ea0d60243b: function(A, I, g) {
        A.reason = k(I, g);
      },
      __wbg_set_search_f9700de567764208: function(A, I, g) {
        A.search = k(I, g);
      },
      __wbg_set_width_8e30d010cd66830d: function(A, I) {
        A.width = I >>> 0;
      },
      __wbg_stack_3b0d974bbf31e44f: function(A, I) {
        const g = I.stack, C = o(g, B.__wbindgen_malloc, B.__wbindgen_realloc), E = N;
        R().setInt32(A + 4, E, true), R().setInt32(A + 0, C, true);
      },
      __wbg_static_accessor_GLOBAL_4ef717fb391d88b7: function() {
        const A = typeof global > "u" ? null : global;
        return h(A) ? 0 : L(A);
      },
      __wbg_static_accessor_GLOBAL_THIS_8d1badc68b5a74f4: function() {
        const A = typeof globalThis > "u" ? null : globalThis;
        return h(A) ? 0 : L(A);
      },
      __wbg_static_accessor_SELF_146583524fe1469b: function() {
        const A = typeof self > "u" ? null : self;
        return h(A) ? 0 : L(A);
      },
      __wbg_static_accessor_WINDOW_f2829a2234d7819e: function() {
        const A = typeof window > "u" ? null : window;
        return h(A) ? 0 : L(A);
      },
      __wbg_statusText_9f08c32741a99815: function(A, I) {
        const g = I.statusText, C = o(g, B.__wbindgen_malloc, B.__wbindgen_realloc), E = N;
        R().setInt32(A + 4, E, true), R().setInt32(A + 0, C, true);
      },
      __wbg_status_c45b3b9b3033184a: function(A) {
        return A.status;
      },
      __wbg_then_16d107c451e9905d: function(A, I, g) {
        return A.then(I, g);
      },
      __wbg_then_6ec10ae38b3e92f7: function(A, I) {
        return A.then(I);
      },
      __wbg_toString_b201c2690bbe445a: function(A) {
        return A.toString();
      },
      __wbg_toString_bac9199ff382784d: function(A) {
        return A.toString();
      },
      __wbg_url_f6cd241d61f89b82: function(A, I) {
        const g = I.url, C = o(g, B.__wbindgen_malloc, B.__wbindgen_realloc), E = N;
        R().setInt32(A + 4, E, true), R().setInt32(A + 0, C, true);
      },
      __wbg_userAgent_0558f0ac642f7771: function() {
        return G(function(A, I) {
          const g = I.userAgent, C = o(g, B.__wbindgen_malloc, B.__wbindgen_realloc), E = N;
          R().setInt32(A + 4, E, true), R().setInt32(A + 0, C, true);
        }, arguments);
      },
      __wbg_warn_b1370d804fa3e259: function(A) {
        console.warn(A);
      },
      __wbg_wasClean_3c7aa2335da09e74: function(A) {
        return A.wasClean;
      },
      __wbg_width_6d9315ecc7140ff6: function(A) {
        return A.width;
      },
      __wbindgen_cast_0000000000000001: function(A, I) {
        return V(A, I, dA);
      },
      __wbindgen_cast_0000000000000002: function(A, I) {
        return V(A, I, pA);
      },
      __wbindgen_cast_0000000000000003: function(A, I) {
        return V(A, I, jA);
      },
      __wbindgen_cast_0000000000000004: function(A, I) {
        return V(A, I, tA);
      },
      __wbindgen_cast_0000000000000005: function(A, I) {
        return V(A, I, VA);
      },
      __wbindgen_cast_0000000000000006: function(A, I) {
        return V(A, I, ZA);
      },
      __wbindgen_cast_0000000000000007: function(A) {
        return A;
      },
      __wbindgen_cast_0000000000000008: function(A, I) {
        return k(A, I);
      },
      __wbindgen_init_externref_table: function() {
        const A = B.__wbindgen_externrefs, I = A.grow(4);
        A.set(0, void 0), A.set(I + 0, void 0), A.set(I + 1, null), A.set(I + 2, true), A.set(I + 3, false);
      }
    }
  };
}
function VA(Q, A) {
  B.wasm_bindgen_f8ac39c25d0db1d6___convert__closures_____invoke_______true_(Q, A);
}
function ZA(Q, A) {
  B.wasm_bindgen_f8ac39c25d0db1d6___convert__closures_____invoke_______true__1_(Q, A);
}
function pA(Q, A, I) {
  B.wasm_bindgen_f8ac39c25d0db1d6___convert__closures_____invoke___web_sys_326bb1cf2feabbb4___features__gen_CloseEvent__CloseEvent______true_(Q, A, I);
}
function jA(Q, A, I) {
  B.wasm_bindgen_f8ac39c25d0db1d6___convert__closures_____invoke___web_sys_326bb1cf2feabbb4___features__gen_CloseEvent__CloseEvent______true__2(Q, A, I);
}
function tA(Q, A, I) {
  B.wasm_bindgen_f8ac39c25d0db1d6___convert__closures_____invoke___web_sys_326bb1cf2feabbb4___features__gen_CloseEvent__CloseEvent______true__3(Q, A, I);
}
function dA(Q, A, I) {
  const g = B.wasm_bindgen_f8ac39c25d0db1d6___convert__closures_____invoke___wasm_bindgen_f8ac39c25d0db1d6___JsValue__core_608f92abc48d28da___result__Result_____wasm_bindgen_f8ac39c25d0db1d6___JsError___true_(Q, A, I);
  if (g[1])
    throw c(g[0]);
}
function WA(Q, A, I, g) {
  B.wasm_bindgen_f8ac39c25d0db1d6___convert__closures_____invoke___js_sys_e09276f0a184f3dc___Function_fn_wasm_bindgen_f8ac39c25d0db1d6___JsValue_____wasm_bindgen_f8ac39c25d0db1d6___sys__Undefined___js_sys_e09276f0a184f3dc___Function_fn_wasm_bindgen_f8ac39c25d0db1d6___JsValue_____wasm_bindgen_f8ac39c25d0db1d6___sys__Undefined_______true_(Q, A, I, g);
}
const lA = ["blob", "arraybuffer"], z = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((Q) => B.__wbg_clipboarddata_free(Q, 1)), IA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((Q) => B.__wbg_clipboarditem_free(Q, 1)), n = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((Q) => B.__wbg_desktopsize_free(Q, 1)), gA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((Q) => B.__wbg_deviceevent_free(Q, 1)), QA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((Q) => B.__wbg_extension_free(Q, 1)), CA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((Q) => B.__wbg_inputtransaction_free(Q, 1)), BA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((Q) => B.__wbg_ironerror_free(Q, 1)), EA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((Q) => B.__wbg_rdcleanpathdetails_free(Q, 1)), DA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((Q) => B.__wbg_rdpfile_free(Q, 1)), wA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((Q) => B.__wbg_session_free(Q, 1)), u = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((Q) => B.__wbg_sessionbuilder_free(Q, 1)), iA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((Q) => B.__wbg_sessionterminationinfo_free(Q, 1));
function L(Q) {
  const A = B.__externref_table_alloc();
  return B.__wbindgen_externrefs.set(A, Q), A;
}
function GA(Q) {
  if (typeof Q == "number" && (Q >= 1114112 || Q >= 55296 && Q < 57344)) throw new Error(`expected a valid Unicode scalar value, found ${Q}`);
}
function Z(Q, A) {
  if (!(Q instanceof A))
    throw new Error(`expected instance of ${A.name}`);
}
const NA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((Q) => B.__wbindgen_destroy_closure(Q.a, Q.b));
function e(Q) {
  const A = typeof Q;
  if (A == "number" || A == "boolean" || Q == null)
    return `${Q}`;
  if (A == "string")
    return `"${Q}"`;
  if (A == "symbol") {
    const C = Q.description;
    return C == null ? "Symbol" : `Symbol(${C})`;
  }
  if (A == "function") {
    const C = Q.name;
    return typeof C == "string" && C.length > 0 ? `Function(${C})` : "Function";
  }
  if (Array.isArray(Q)) {
    const C = Q.length;
    let E = "[";
    C > 0 && (E += e(Q[0]));
    for (let D = 1; D < C; D++)
      E += ", " + e(Q[D]);
    return E += "]", E;
  }
  const I = /\[object ([^\]]+)\]/.exec(toString.call(Q));
  let g;
  if (I && I.length > 1)
    g = I[1];
  else
    return toString.call(Q);
  if (g == "Object")
    try {
      return "Object(" + JSON.stringify(Q) + ")";
    } catch {
      return "Object";
    }
  return Q instanceof Error ? `${Q.name}: ${Q.message}
${Q.stack}` : g;
}
function XA(Q, A) {
  Q = Q >>> 0;
  const I = R(), g = [];
  for (let C = Q; C < Q + 4 * A; C += 4)
    g.push(B.__wbindgen_externrefs.get(I.getUint32(C, true)));
  return B.__externref_drop_slice(Q, A), g;
}
function OA(Q, A) {
  return Q = Q >>> 0, fA().subarray(Q / 2, Q / 2 + A);
}
function bA(Q, A) {
  return Q = Q >>> 0, PA().subarray(Q / 4, Q / 4 + A);
}
function q(Q, A) {
  return Q = Q >>> 0, p().subarray(Q / 1, Q / 1 + A);
}
function xA(Q, A) {
  return Q = Q >>> 0, mA().subarray(Q / 1, Q / 1 + A);
}
let s = null;
function R() {
  return (s === null || s.buffer.detached === true || s.buffer.detached === void 0 && s.buffer !== B.memory.buffer) && (s = new DataView(B.memory.buffer)), s;
}
function k(Q, A) {
  return rA(Q >>> 0, A);
}
let d = null;
function fA() {
  return (d === null || d.byteLength === 0) && (d = new Uint16Array(B.memory.buffer)), d;
}
let W = null;
function PA() {
  return (W === null || W.byteLength === 0) && (W = new Uint32Array(B.memory.buffer)), W;
}
let l = null;
function p() {
  return (l === null || l.byteLength === 0) && (l = new Uint8Array(B.memory.buffer)), l;
}
let X = null;
function mA() {
  return (X === null || X.byteLength === 0) && (X = new Uint8ClampedArray(B.memory.buffer)), X;
}
function G(Q, A) {
  try {
    return Q.apply(this, A);
  } catch (I) {
    const g = L(I);
    B.__wbindgen_exn_store(g);
  }
}
function h(Q) {
  return Q == null;
}
function V(Q, A, I) {
  const g = { a: Q, b: A, cnt: 1 }, C = (...E) => {
    g.cnt++;
    const D = g.a;
    g.a = 0;
    try {
      return I(D, g.b, ...E);
    } finally {
      g.a = D, C._wbg_cb_unref();
    }
  };
  return C._wbg_cb_unref = () => {
    --g.cnt === 0 && (B.__wbindgen_destroy_closure(g.a, g.b), g.a = 0, NA.unregister(g));
  }, NA.register(C, g, g), C;
}
function _(Q, A) {
  const I = A(Q.length * 1, 1) >>> 0;
  return p().set(Q, I / 1), N = Q.length, I;
}
function o(Q, A, I) {
  if (I === void 0) {
    const w = O.encode(Q), i = A(w.length, 1) >>> 0;
    return p().subarray(i, i + w.length).set(w), N = w.length, i;
  }
  let g = Q.length, C = A(g, 1) >>> 0;
  const E = p();
  let D = 0;
  for (; D < g; D++) {
    const w = Q.charCodeAt(D);
    if (w > 127) break;
    E[C + D] = w;
  }
  if (D !== g) {
    D !== 0 && (Q = Q.slice(D)), C = I(C, g, g = D + Q.length * 3, 1) >>> 0;
    const w = p().subarray(C + D, C + g), i = O.encodeInto(Q, w);
    D += i.written, C = I(C, g, D, 1) >>> 0;
  }
  return N = D, C;
}
function c(Q) {
  const A = B.__wbindgen_externrefs.get(Q);
  return B.__externref_table_dealloc(Q), A;
}
let T = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
T.decode();
const TA = 2146435072;
let v = 0;
function rA(Q, A) {
  return v += A, v >= TA && (T = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true }), T.decode(), v = A), T.decode(p().subarray(Q, Q + A));
}
const O = new TextEncoder();
"encodeInto" in O || (O.encodeInto = function(Q, A) {
  const I = O.encode(Q);
  return A.set(I), {
    read: Q.length,
    written: I.length
  };
});
let N = 0, B;
function zA(Q, A) {
  return B = Q.exports, s = null, d = null, W = null, l = null, X = null, B.__wbindgen_start(), B;
}
async function nA(Q, A) {
  if (typeof Response == "function" && Q instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming == "function")
      try {
        return await WebAssembly.instantiateStreaming(Q, A);
      } catch (C) {
        if (Q.ok && I(Q.type) && Q.headers.get("Content-Type") !== "application/wasm")
          console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", C);
        else
          throw C;
      }
    const g = await Q.arrayBuffer();
    return await WebAssembly.instantiate(g, A);
  } else {
    const g = await WebAssembly.instantiate(Q, A);
    return g instanceof WebAssembly.Instance ? { instance: g, module: Q } : g;
  }
  function I(g) {
    switch (g) {
      case "basic":
      case "cors":
      case "default":
        return true;
    }
    return false;
  }
}
async function uA(Q) {
  if (B !== void 0) return B;
  Q !== void 0 && (Object.getPrototypeOf(Q) === Object.prototype ? { module_or_path: Q } = Q : console.warn("using deprecated parameters for the initialization function; pass a single object instead")), Q === void 0 && (Q = new URL("./iron-remote-desktop-rdp_bg.wasm", import.meta.url));
  const A = qA();
  (typeof Q == "string" || typeof Request == "function" && Q instanceof Request || typeof URL == "function" && Q instanceof URL) && (Q = fetch(Q));
  const { instance: I, module: g } = await nA(await Q, A);
  return zA(I);
}
const t = {
  /**
   * Request file size (8-byte unsigned integer).
   * When set: position must be 0, size must be 8.
   */
  SIZE: 1,
  /**
   * Request byte range from file.
   * When set: position and size define the requested range.
   */
  RANGE: 2
};
function vA(Q) {
  return new F("files_available_callback", Q);
}
function eA(Q) {
  return new F("file_contents_request_callback", Q);
}
function _A(Q) {
  return new F("file_contents_response_callback", Q);
}
function $A(Q) {
  return new F("lock_callback", Q);
}
function AI(Q) {
  return new F("unlock_callback", Q);
}
function II(Q) {
  return new F("locks_expired_callback", Q);
}
function gI(Q) {
  return new F("format_list_response_callback", Q);
}
const GI = {
  PostScript: "MS Publisher Imagesetter",
  MicrosoftPrintToPdf: "Microsoft Print to PDF"
};
function NI(Q) {
  return new F("print_job_stream_callbacks", Q);
}
function FI(Q) {
  return new F("printer_name", Q);
}
function oI(Q) {
  return new F("printer_device_id", Q);
}
function kI(Q) {
  return new F("printer_driver_name", Q);
}
function QI(Q) {
  return new F("request_file_contents", Q);
}
function CI(Q) {
  return new F("submit_file_contents", Q);
}
function BI(Q) {
  return new F("initiate_file_copy", Q);
}
class EI {
  constructor() {
    __publicField(this, "chunks", []);
    __publicField(this, "_bytesWritten", 0);
    __publicField(this, "finalized", false);
  }
  get bytesWritten() {
    return this._bytesWritten;
  }
  async write(A) {
    if (this.finalized)
      throw new Error("BlobWriteHandle: write after finalize/abort");
    this.chunks.push(A), this._bytesWritten += A.length;
  }
  async finalize() {
    if (this.finalized)
      throw new Error("BlobWriteHandle: already finalized or aborted");
    this.finalized = true;
    const A = new Blob(this.chunks);
    return this.chunks = [], A;
  }
  async abort() {
    this.finalized || (this.finalized = true, this.chunks = []);
  }
}
class FA {
  constructor() {
    __publicField(this, "name", "blob");
  }
  async createWriteHandle(A, I) {
    return new EI();
  }
  async dispose() {
  }
}
class DI {
  constructor(A, I, g, C) {
    __publicField(this, "writable");
    __publicField(this, "_bytesWritten", 0);
    __publicField(this, "finalized", false);
    this.fileHandle = A, this.sessionDir = I, this.entryName = g, this.writable = C;
  }
  get bytesWritten() {
    return this._bytesWritten;
  }
  async write(A) {
    if (this.finalized || !this.writable)
      throw new Error("OpfsWriteHandle: write after finalize/abort");
    await this.writable.write(A), this._bytesWritten += A.length;
  }
  async finalize() {
    if (this.finalized)
      throw new Error("OpfsWriteHandle: already finalized or aborted");
    return this.finalized = true, this.writable && (await this.writable.close(), this.writable = void 0), this.fileHandle.getFile();
  }
  async abort() {
    if (!this.finalized) {
      if (this.finalized = true, this.writable) {
        try {
          await this.writable.abort();
        } catch {
        }
        this.writable = void 0;
      }
      try {
        await this.sessionDir.removeEntry(this.entryName);
      } catch {
      }
    }
  }
}
const _j = class _j {
  constructor(A, I, g) {
    __publicField(this, "name", "opfs");
    /** Sequence counter for generating unique temp file names. */
    __publicField(this, "sequence", 0);
    this.opfsRoot = A, this.sessionDir = I, this.sessionId = g;
  }
  /**
   * Create an OPFS backend, including the per-session directory.
   *
   * Call {@link probe} first to verify OPFS is available before
   * constructing -- this factory assumes OPFS works.
   */
  static async create(A, I) {
    const g = I ?? `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, C = await A.getDirectoryHandle("ironrdp-transfers", { create: true }), E = await C.getDirectoryHandle(g, { create: true });
    return _j.cleanupStale(C, g), new _j(A, E, g);
  }
  // 24 hours
  /**
   * Remove session directories older than {@link STALE_SESSION_THRESHOLD_MS}.
   *
   * Session IDs generated by {@link create} embed a timestamp in the
   * format `s-{Date.now()}-{random}`.  This method parses that timestamp
   * to determine age.  Directories with unparsable names or those
   * belonging to the current session are skipped.
   */
  static async cleanupStale(A, I) {
    const g = Date.now();
    try {
      for await (const C of A.keys()) {
        if (C === I)
          continue;
        const E = /^s-(\d+)-/.exec(C);
        if (!E)
          continue;
        const D = Number(E[1]);
        if (g - D > _j.STALE_SESSION_THRESHOLD_MS)
          try {
            await A.removeEntry(C, { recursive: true });
          } catch {
          }
      }
    } catch {
    }
  }
  /**
   * Probe whether OPFS is usable in the current context.
   *
   * Performs a full round-trip: creates a temp file, opens a writable,
   * closes it, and deletes it.  This catches environments where the API
   * exists but throws at runtime (e.g., some private browsing modes).
   */
  static async probe(A) {
    try {
      return await (await (await A.getFileHandle(".ironrdp-opfs-probe", { create: true })).createWritable()).close(), await A.removeEntry(".ironrdp-opfs-probe"), true;
    } catch {
      return false;
    }
  }
  async createWriteHandle(A, I) {
    if (!this.sessionDir)
      throw new Error("OpfsStorageBackend: backend has been disposed");
    const C = `${this.sequence++}-${wI(A)}`, E = await this.sessionDir.getFileHandle(C, { create: true }), D = await E.createWritable();
    return new DI(E, this.sessionDir, C, D);
  }
  async dispose() {
    if (!this.sessionDir)
      return;
    const A = this.sessionDir;
    this.sessionDir = void 0;
    try {
      const I = await this.opfsRoot.getDirectoryHandle("ironrdp-transfers");
      await I.removeEntry(this.sessionId, { recursive: true });
      let g = false;
      for await (const C of I.values()) {
        g = true;
        break;
      }
      g || await this.opfsRoot.removeEntry("ironrdp-transfers");
    } catch (I) {
      console.debug("OPFS session directory removal failed, falling back to per-file cleanup:", I);
      try {
        for await (const g of A.keys())
          try {
            await A.removeEntry(g);
          } catch {
          }
      } catch {
      }
    }
  }
};
/** Maximum age (in milliseconds) before a session directory is considered stale. */
__publicField(_j, "STALE_SESSION_THRESHOLD_MS", 1440 * 60 * 1e3);
let j = _j;
function wI(Q) {
  let A = Q.replace(/[\u0000-\u001f]/g, "");
  A = A.replace(/[/\\]/g, "_"), A = A.replace(/^\.+/, ""), A.length === 0 && (A = "unnamed");
  const I = new TextEncoder();
  if (I.encode(A).byteLength > 200) {
    for (; I.encode(A).byteLength > 200; )
      A = A.slice(0, -1);
    A.length === 0 && (A = "unnamed");
  }
  return A;
}
async function iI(Q = "auto", A) {
  var _a, _b;
  if (Q === "blob")
    return new FA();
  if (typeof ((_b = (_a = globalThis.navigator) == null ? void 0 : _a.storage) == null ? void 0 : _b.getDirectory) == "function")
    try {
      const I = await navigator.storage.getDirectory();
      if (await j.probe(I))
        return j.create(I, A);
      console.debug("OPFS probe failed (createWritable not functional), falling back to blob storage");
    } catch (I) {
      console.debug("OPFS unavailable, falling back to blob storage:", I);
    }
  return new FA();
}
const _Y = class _Y {
  constructor(A) {
    __publicField(this, "session");
    __publicField(this, "chunkSize");
    __publicField(this, "onUploadStarted");
    __publicField(this, "onUploadFinished");
    __publicField(this, "storagePreference");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __publicField(this, "eventHandlers", /* @__PURE__ */ new Map());
    __publicField(this, "storageBackend");
    __publicField(this, "storageBackendReady");
    __publicField(this, "activeDownloads", /* @__PURE__ */ new Map());
    __publicField(this, "uploadState");
    // Upload paste-window watchdog. Armed when we advertise an upload, disarmed on the
    // first FileContentsRequest (the remote pulled the files). Being armed is the single
    // "advertised but not yet pulled" signal: on timeout it resumes monitoring and fails
    // the never-pulled upload, and handleFormatListResponse consults it to fail a refused
    // paste early (handleUnlock is a deliberate no-op: Unlock is not a reliable failure
    // signal). Upload completion/failure run only after that first request, so they need
    // not touch it.
    __publicField(this, "pasteAckTimeout");
    // Upload inactivity watchdog. Armed/reset on each FileContentsRequest once the remote
    // starts pulling; fires if pulls stop for UPLOAD_INACTIVITY_TIMEOUT_MS (a stalled or
    // clipboard-superseded paste) to release uploadState. Complements the paste-ack
    // watchdog above, which only covers the "advertised but never pulled" case.
    __publicField(this, "uploadInactivityTimeout");
    // True between onUploadStarted (suppress monitoring) and onUploadFinished
    // (resume), so resume fires exactly once even though it is now deferred until
    // the paste is pulled, times out, fails, or the provider is disposed.
    __publicField(this, "uploadMonitoringSuppressed", false);
    // DroppedFile metadata retained after upload completes so re-paste works
    // without re-dropping. Cleared when a new upload starts or the manager is disposed.
    __publicField(this, "retainedFiles");
    __publicField(this, "availableFiles", []);
    // Clipboard lock ID received with the most recent file list. The Rust layer
    // acquires this lock automatically when FileGroupDescriptorW is detected in
    // the FormatList. Downloads use it instead of explicit lock/unlock calls -
    // the lock lifecycle is managed entirely by the Rust cliprdr processor.
    __publicField(this, "clipDataId");
    __publicField(this, "nextStreamId", 1);
    __publicField(this, "disposed", false);
    this.chunkSize = (A == null ? void 0 : A.chunkSize) ?? 65536, this.onUploadStarted = A == null ? void 0 : A.onUploadStarted, this.onUploadFinished = A == null ? void 0 : A.onUploadFinished;
    const I = A == null ? void 0 : A.storageBackend;
    if (typeof I == "object" && I !== null) {
      if (typeof I.createWriteHandle != "function" || typeof I.dispose != "function")
        throw new Error(
          "storageBackend: expected 'auto', 'blob', or a FileStorageBackend with createWriteHandle() and dispose() methods"
        );
      this.storageBackend = I, this.storagePreference = "auto";
    } else {
      const g = I ?? "auto";
      if (g !== "auto" && g !== "blob")
        throw new Error(
          `storageBackend: invalid preference '${g}', expected 'auto', 'blob', or a FileStorageBackend instance`
        );
      this.storagePreference = g;
    }
  }
  /**
   * Set the session instance after connection is established.
   * Called by the web component's connect() flow via the FileTransferProvider interface.
   */
  setSession(A) {
    this.session = A;
  }
  ensureSession() {
    if (this.session === void 0)
      throw new Error("RdpFileTransferProvider: Session not available. Ensure connect() has been called.");
    return this.session;
  }
  /**
   * Lazily initialize and return the storage backend.
   *
   * Detection is performed once and cached.  Concurrent callers share
   * the same initialization promise so the probe only runs once.
   * If detection fails the cached promise is cleared so subsequent
   * downloads can retry.
   */
  async ensureStorageBackend() {
    return this.storageBackend ? this.storageBackend : (this.storageBackendReady || (this.storageBackendReady = iI(this.storagePreference).then((A) => (this.storageBackend = A, console.debug(`File transfer storage: ${A.name}`), A)).catch((A) => {
      throw this.storageBackendReady = void 0, A;
    })), this.storageBackendReady);
  }
  // --- Extension-based session method wrappers ---
  // These replace direct session.requestFileContents() etc. calls
  // with invokeExtension() to keep the Session interface protocol-agnostic.
  sendRequestFileContents(A, I, g, C, E, D) {
    this.ensureSession().invokeExtension(
      QI({
        stream_id: A,
        file_index: I,
        flags: g,
        position: C,
        size: E,
        clip_data_id: D
      })
    );
  }
  sendSubmitFileContents(A, I, g) {
    var _a;
    (_a = this.session) == null ? void 0 : _a.invokeExtension(CI({ stream_id: A, is_error: I, data: g }));
  }
  sendInitiateFileCopy(A) {
    this.ensureSession().invokeExtension(BI(A));
  }
  /**
   * Returns the extension objects to register on the SessionBuilder before connect().
   * Implements the FileTransferProvider interface.
   */
  getBuilderExtensions() {
    return [
      vA(
        (A, I) => this.handleFilesAvailable(A, I)
      ),
      eA((A) => this.handleFileContentsRequest(A)),
      _A((A) => this.handleFileContentsResponse(A)),
      $A((A) => this.handleLock(A)),
      AI((A) => this.handleUnlock(A)),
      II((A) => this.handleLocksExpired(A)),
      gI((A) => this.handleFormatListResponse(A))
    ];
  }
  /**
   * Register an event handler.
   *
   * @param event - Event name
   * @param handler - Event handler function
   *
   * @example
   * ```typescript
   * manager.on('download-progress', (progress) => {
   *   console.log(`${progress.fileName}: ${progress.percentage}%`);
   * });
   * ```
   */
  on(A, I) {
    this.eventHandlers.has(A) || this.eventHandlers.set(A, /* @__PURE__ */ new Set()), this.eventHandlers.get(A).add(I);
  }
  /**
   * Unregister an event handler.
   *
   * @param event - Event name
   * @param handler - Event handler function to remove
   */
  off(A, I) {
    const g = this.eventHandlers.get(A);
    g && g.delete(I);
  }
  /**
   * Emit an event to all registered handlers.
   */
  emit(A, ...I) {
    const g = this.eventHandlers.get(A);
    if (g)
      for (const C of g)
        try {
          C(...I);
        } catch (E) {
          console.error(`Error in ${A} handler:`, E);
        }
  }
  /**
   * Download a single file from the remote.
   *
   * Returns a {@link DownloadHandle} with a `transferId` available synchronously
   * (for immediate UI association) and a `completion` promise that resolves with
   * the downloaded blob.
   *
   * @param fileInfo - File metadata from 'files-available' event
   * @param fileIndex - Index of the file in the original file list
   * @returns Handle with synchronous transferId and async completion
   *
   * @example
   * ```typescript
   * const { transferId, completion } = manager.downloadFile(fileInfo, 0);
   * // transferId is available immediately for UI binding
   * const blob = await completion;
   * saveAs(blob, fileInfo.name);
   * ```
   */
  downloadFile(A, I) {
    const g = this.generateStreamId(), C = this.executeDownload(A, I, g);
    return { transferId: g, completion: C };
  }
  /**
   * Internal: execute the async download workflow for a single file.
   */
  async executeDownload(A, I, g) {
    const C = this.clipDataId, E = new Promise((D, w) => {
      const i = {
        fileInfo: A,
        fileIndex: I,
        streamId: g,
        clipDataId: C,
        bytesReceived: 0,
        resolve: D,
        reject: w
      };
      this.activeDownloads.set(g, i);
    });
    try {
      this.sendRequestFileContents(g, I, t.SIZE, 0, 8, C);
    } catch (D) {
      this.activeDownloads.delete(g);
      const w = {
        message: "Failed to request file size",
        transferId: g,
        fileIndex: I,
        fileName: A.name,
        direction: "download",
        cause: D
      };
      throw this.emit("error", w), new Error(w.message, { cause: D });
    }
    return E;
  }
  /**
   * Download multiple files sequentially.
   *
   * @param files - Array of FileInfo from 'files-available' event
   * @returns AsyncGenerator yielding file/blob pairs as they complete
   *
   * @example
   * ```typescript
   * for await (const { file, blob } of manager.downloadFiles(files)) {
   *   saveAs(blob, file.name);
   * }
   * ```
   */
  async *downloadFiles(A) {
    for (let I = 0; I < A.length; I++) {
      const g = A[I], { transferId: C, completion: E } = this.downloadFile(g, I), D = await E;
      yield { file: g, blob: D, transferId: C };
    }
  }
  /**
   * Download multiple files concurrently with configurable parallelism.
   *
   * This method initiates multiple file downloads in parallel, improving
   * performance for multi-file transfers. Each file uses an independent
   * clipboard lock and stream ID.
   *
   * @param files - Array of FileInfo from 'files-available' event
   * @param options - Download options
   * @param options.maxConcurrent - Maximum concurrent downloads (default: 3)
   * @returns Promise resolving to map of fileIndex to Blob
   *
   * @example
   * ```typescript
   * const blobs = await manager.downloadFilesConcurrent(files, { maxConcurrent: 5 });
   * files.forEach((file, i) => saveAs(blobs.get(i)!, file.name));
   * ```
   */
  async downloadFilesConcurrent(A, I = {}) {
    const g = I.maxConcurrent ?? 3, C = /* @__PURE__ */ new Map(), E = [], D = A.map((i, y) => async () => {
      try {
        const { completion: K } = this.downloadFile(i, y), J = await K;
        C.set(y, J);
      } catch (K) {
        E.push({ index: y, error: K });
      }
    }), w = [];
    for (const i of D) {
      const y = i().finally(() => {
        w.splice(w.indexOf(y), 1);
      });
      w.push(y), w.length >= g && await Promise.race(w);
    }
    if (await Promise.all(w), E.length > 0)
      throw new Error(
        `Failed to download ${E.length} file(s): ` + E.map((i) => `file ${i.index}: ${i.error}`).join(", ")
      );
    return C;
  }
  /**
   * Upload files to the remote.
   *
   * Returns an {@link UploadHandle} with per-file `transferIds` available
   * synchronously (for immediate UI association) and a `completion` promise
   * that resolves when all files have been uploaded.
   *
   * @param files - Array of File objects to upload
   * @returns Handle with synchronous transferIds and async completion
   *
   * @example
   * ```typescript
   * const files = await manager.showFilePicker({ multiple: true });
   * const { transferIds, completion } = manager.uploadFiles(files);
   * // transferIds available immediately for UI binding
   * await completion;
   * ```
   */
  uploadFiles(A) {
    this.uploadState !== void 0 && this.supersedeUpload(), this.retainedFiles = void 0;
    const I = _Y.normalizeToDroppedFiles(A), g = /* @__PURE__ */ new Map();
    for (let i = 0; i < I.length; i++)
      g.set(i, this.generateStreamId());
    const C = I.map((i) => ({
      name: i.name,
      size: i.size,
      lastModified: i.lastModified,
      path: i.path,
      isDirectory: i.isDirectory
    })), E = I.filter((i) => i.isDirectory !== true).length, D = I.map((i) => i.file), w = new Promise((i, y) => {
      this.uploadState = {
        files: D,
        droppedFiles: I,
        failedFiles: /* @__PURE__ */ new Set(),
        expectedFileCount: E,
        completedFiles: /* @__PURE__ */ new Set(),
        bytesServed: /* @__PURE__ */ new Map(),
        activeReaders: /* @__PURE__ */ new Map(),
        readerTimeouts: /* @__PURE__ */ new Map(),
        transferIds: g,
        resolve: i,
        reject: y
      }, this.suppressUploadMonitoring();
      try {
        this.sendInitiateFileCopy(C), this.emit("upload-batch-started", g, I);
      } catch (K) {
        this.uploadState = void 0, this.resumeUploadMonitoring();
        const J = {
          message: "Failed to initiate file upload",
          direction: "upload",
          cause: K
        };
        this.emit("error", J), y(new Error(J.message, { cause: K }));
        return;
      }
      this.armPasteAckWatchdog();
    });
    return { transferIds: g, completion: w };
  }
  /** Whether an upload batch is currently advertised or in flight (a fresh upload, or a re-paste
   *  rebuilt from retained files). */
  isUploadInProgress() {
    return this.uploadState !== void 0;
  }
  /** Suppress clipboard monitoring for an upload's paste window. Idempotent: a supersede keeps
   *  monitoring suppressed across the old->new upload, so this must not re-fire `onUploadStarted`. */
  suppressUploadMonitoring() {
    var _a;
    if (!this.uploadMonitoringSuppressed) {
      this.uploadMonitoringSuppressed = true;
      try {
        (_a = this.onUploadStarted) == null ? void 0 : _a.call(this);
      } catch (A) {
        console.error("Error in onUploadStarted callback:", A);
      }
    }
  }
  /** Resume clipboard monitoring (idempotent: fires onUploadFinished at most once
   *  per upload, since the resume point is now deferred past the wire send). */
  resumeUploadMonitoring() {
    var _a;
    if (this.uploadMonitoringSuppressed) {
      this.uploadMonitoringSuppressed = false;
      try {
        (_a = this.onUploadFinished) == null ? void 0 : _a.call(this);
      } catch (A) {
        console.error("Error in onUploadFinished callback:", A);
      }
    }
  }
  /** Arm the paste-acknowledgment watchdog for the current upload. */
  armPasteAckWatchdog() {
    this.clearPasteAckWatchdog(), this.clearUploadInactivityWatchdog(), this.pasteAckTimeout = setTimeout(() => {
      this.pasteAckTimeout = void 0;
      const A = this.uploadState;
      A !== void 0 && A.isRePaste !== true ? this.failPendingUpload("The remote did not request the files in time, so the paste was not completed") : this.resumeUploadMonitoring();
    }, _Y.PASTE_ACK_TIMEOUT_MS);
  }
  /** Disarm the paste-acknowledgment watchdog, if armed. */
  clearPasteAckWatchdog() {
    this.pasteAckTimeout !== void 0 && (clearTimeout(this.pasteAckTimeout), this.pasteAckTimeout = void 0);
  }
  /**
   * (Re)arm the upload inactivity watchdog (see {@link UPLOAD_INACTIVITY_TIMEOUT_MS}).
   * Called on every FileContentsRequest, so continued pulls keep resetting it and a
   * slow-but-progressing transfer is never killed; if pulls stop for the window the
   * upload is failed (releasing uploadState). Skipped for re-pastes, matching the
   * paste-ack watchdog.
   */
  resetUploadInactivityWatchdog() {
    this.clearUploadInactivityWatchdog(), this.uploadInactivityTimeout = setTimeout(() => {
      this.uploadInactivityTimeout = void 0;
      const A = this.uploadState;
      A !== void 0 && A.isRePaste !== true && this.failPendingUpload("The remote stopped requesting the files, so the paste did not complete");
    }, _Y.UPLOAD_INACTIVITY_TIMEOUT_MS);
  }
  /** Disarm the upload inactivity watchdog, if armed. */
  clearUploadInactivityWatchdog() {
    this.uploadInactivityTimeout !== void 0 && (clearTimeout(this.uploadInactivityTimeout), this.uploadInactivityTimeout = void 0);
  }
  /**
   * The remote acknowledged the paste by requesting file contents: the clobber
   * window is over, so disarm the paste-ack watchdog and resume clipboard monitoring.
   * Called on every FileContentsRequest; only the first disarms/resumes. Every request
   * also (re)arms the inactivity watchdog so a stall after pulling began is recovered.
   */
  acknowledgePaste() {
    this.pasteAckTimeout !== void 0 && (this.clearPasteAckWatchdog(), this.resumeUploadMonitoring());
    const A = this.uploadState;
    if (A !== void 0 && A.isRePaste !== true && A.expectedFileCount === 0) {
      this.finishUploadBatch(A);
      return;
    }
    this.resetUploadInactivityWatchdog();
  }
  /**
   * Abort any in-flight chunk reads for a batch and clear their timeouts. Without this, a read
   * still running when the batch is torn down keeps its FileReader and a 60s reader-timeout
   * alive. Shared by every upload teardown path (fail, supersede, dispose).
   */
  abortInFlightReads(A) {
    for (const I of A.readerTimeouts.values())
      clearTimeout(I);
    A.readerTimeouts.clear();
    for (const I of A.activeReaders.values())
      I.abort();
    A.activeReaders.clear();
  }
  /**
   * Fail the in-flight upload (reject its completion, emit an upload error, clear
   * uploadState) and resume monitoring. Used when the advertise is rejected or the
   * paste is never pulled, so `uploadState` is released instead of lingering and
   * throwing "Upload already in progress" on every later upload.
   */
  failPendingUpload(A) {
    this.clearPasteAckWatchdog(), this.clearUploadInactivityWatchdog(), this.resumeUploadMonitoring();
    const I = this.uploadState;
    if (I === void 0)
      return;
    this.abortInFlightReads(I);
    const g = { message: A, direction: "upload" };
    this.emit("error", g);
    const { reject: C } = I;
    this.uploadState = void 0, C(new Error(A));
  }
  /**
   * Tear down the current upload because a new paste is replacing it. Unlike
   * {@link failPendingUpload}, this emits no error and leaves monitoring suppressed (a new upload
   * is starting); it aborts in-flight reads, clears the state, and *resolves* the old completion
   * (a replacement, not a failure).
   */
  supersedeUpload() {
    this.clearPasteAckWatchdog(), this.clearUploadInactivityWatchdog();
    const A = this.uploadState;
    if (A === void 0)
      return;
    this.abortInFlightReads(A);
    const { resolve: I } = A;
    this.uploadState = void 0, I();
  }
  /**
   * Finalize a fully-accounted upload batch (every counted file either served in full
   * or permanently failed). Stops the inactivity watchdog so it cannot linger past
   * completion, retains the DroppedFile metadata so a re-paste from the remote can serve
   * the data again, clears `uploadState`, and resolves the completion promise.
   */
  finishUploadBatch(A) {
    this.clearUploadInactivityWatchdog(), this.retainedFiles = A.droppedFiles, this.uploadState = void 0, A.resolve();
  }
  /**
   * Show a file picker dialog and return selected files.
   *
   * Note: This must be called in response to a user gesture (e.g., button click)
   * due to browser security restrictions.
   *
   * @param options - File picker options
   * @returns Promise resolving to selected File objects
   *
   * @example
   * ```typescript
   * button.onclick = async () => {
   *   const files = await manager.showFilePicker({ multiple: true, accept: 'image/*' });
   *   await manager.uploadFiles(files);
   * };
   * ```
   */
  showFilePicker(A) {
    return new Promise((I) => {
      const g = document.createElement("input");
      g.type = "file", g.style.display = "none", (A == null ? void 0 : A.multiple) === true && (g.multiple = true), (A == null ? void 0 : A.accept) !== void 0 && A.accept.length > 0 && (g.accept = A.accept), g.addEventListener("change", () => {
        const w = Array.from(g.files || []);
        E(), window.removeEventListener("focus", D), I(w);
      });
      let C = false;
      const E = () => {
        C || (C = true, g.parentNode && document.body.removeChild(g));
      };
      g.addEventListener("cancel", () => {
        E(), window.removeEventListener("focus", D), I([]);
      });
      const D = () => {
        setTimeout(() => {
          C || (E(), I([])), window.removeEventListener("focus", D);
        }, 300);
      };
      window.addEventListener("focus", D), document.body.appendChild(g), g.click();
    });
  }
  /**
   * Extract files (and recursively traverse directories) from a drag-and-drop event.
   *
   * Uses the File and Directory Entries API (`webkitGetAsEntry`) which is
   * supported across all major browsers (Chrome, Firefox, Safari, Edge).
   * Falls back to `getAsFile()` when the Entries API is unavailable.
   *
   * Directory entries are included in the result with `isDirectory: true`
   * and a `null` file handle.  Files inside directories have their
   * {@link DroppedFile.path} set to the relative backslash-separated path.
   *
   * @param event - DragEvent from drop handler
   * @returns Promise resolving to an array of DroppedFile descriptors
   *
   * @example
   * ```typescript
   * dropZone.addEventListener('drop', async (e) => {
   *   const files = await manager.handleDrop(e);
   *   manager.uploadFiles(files);
   * });
   * ```
   */
  async handleDrop(A) {
    var _a, _b, _c;
    A.preventDefault();
    const I = [];
    if ((_a = A.dataTransfer) == null ? void 0 : _a.items) {
      const g = [], C = [];
      for (const E of A.dataTransfer.items) {
        if (E.kind !== "file") continue;
        const D = (_b = E.webkitGetAsEntry) == null ? void 0 : _b.call(E);
        if (D)
          g.push(D);
        else {
          const w = E.getAsFile();
          w && C.push(w);
        }
      }
      for (const E of g)
        await this.traverseEntry(E, void 0, I, 0);
      for (const E of C)
        I.push({
          file: E,
          name: E.name,
          size: E.size,
          lastModified: E.lastModified
        });
    } else if ((_c = A.dataTransfer) == null ? void 0 : _c.files)
      for (const g of Array.from(A.dataTransfer.files))
        I.push({
          file: g,
          name: g.name,
          size: g.size,
          lastModified: g.lastModified
        });
    return I;
  }
  /**
   * Normalize a plain `File[]` or `DroppedFile[]` into `DroppedFile[]`.
   * Allows `uploadFiles` to accept either type for backward compatibility.
   */
  static normalizeToDroppedFiles(A) {
    return A.length === 0 ? [] : "file" in A[0] ? A : A.map((g) => ({
      file: g,
      name: g.name,
      size: g.size,
      lastModified: g.lastModified
    }));
  }
  /**
   * Recursively traverse a FileSystemEntry, collecting files and directory
   * entries into `results`.
   */
  async traverseEntry(A, I, g, C) {
    if (!(g.length >= _Y.MAX_DIRECTORY_ENTRIES)) {
      if (C > _Y.MAX_DIRECTORY_DEPTH) {
        console.warn(
          `Skipping "${A.name}": directory depth exceeds ${_Y.MAX_DIRECTORY_DEPTH}`
        );
        return;
      }
      if (A.isFile) {
        const E = await new Promise((D, w) => {
          A.file(D, w);
        });
        g.push({
          file: E,
          name: E.name,
          size: E.size,
          lastModified: E.lastModified,
          path: I
        });
      } else if (A.isDirectory) {
        const E = I !== void 0 ? `${I}\\${A.name}` : A.name;
        g.push({
          file: null,
          name: A.name,
          size: 0,
          lastModified: 0,
          path: I,
          isDirectory: true
        });
        const D = A.createReader(), w = await _Y.readAllDirectoryEntries(D);
        for (const i of w)
          await this.traverseEntry(i, E, g, C + 1);
      }
    }
  }
  /**
   * Read all entries from a FileSystemDirectoryReader.  Chromium-based
   * browsers return at most 100 entries per `readEntries()` call, so we
   * must loop until an empty batch is returned.
   */
  static readAllDirectoryEntries(A) {
    return new Promise((I, g) => {
      const C = [], E = () => {
        A.readEntries((D) => {
          D.length === 0 ? I(C) : (C.push(...D), E());
        }, g);
      };
      E();
    });
  }
  /**
   * Prevent default drag-over behavior to enable drop target.
   *
   * This must be called in the dragover event handler for drag-and-drop to work.
   *
   * @param event - DragEvent from dragover handler
   *
   * @example
   * ```typescript
   * dropZone.addEventListener('dragover', (e) => manager.handleDragOver(e));
   * ```
   */
  handleDragOver(A) {
    A.preventDefault();
  }
  /**
   * Cleanup resources and unregister callbacks.
   *
   * Call this when the session is terminating or RdpFileTransferProvider is no longer needed.
   */
  dispose() {
    this.disposed = true, this.clearPasteAckWatchdog(), this.clearUploadInactivityWatchdog(), this.resumeUploadMonitoring();
    for (const A of this.activeDownloads.values())
      this.abortWriteHandle(A), A.reject(new Error("RdpFileTransferProvider disposed"));
    this.activeDownloads.clear(), this.uploadState !== void 0 && (this.abortInFlightReads(this.uploadState), this.uploadState.reject(new Error("RdpFileTransferProvider disposed"))), this.uploadState = void 0, this.retainedFiles = void 0, this.availableFiles = [], this.clipDataId = void 0, this.storageBackend && (this.storageBackend.dispose(), this.storageBackend = void 0, this.storageBackendReady = void 0), this.eventHandlers.clear();
  }
  // ==================== Callback Handlers ====================
  handleFilesAvailable(A, I) {
    this.failPendingUpload("Upload interrupted: the remote clipboard changed");
    const g = A.map((C) => ({
      ...C,
      name: _Y.sanitizeFileName(C.name),
      path: C.path !== void 0 ? _Y.sanitizePath(C.path) : void 0
    }));
    this.availableFiles = g, this.clipDataId = I, this.emit("files-available", g);
  }
  /**
   * Extract the basename from a file name, stripping any path traversal or
   * directory components. Returns "unnamed_file" if the name is empty or
   * consists entirely of path separators / traversal sequences.
   */
  /** @internal Visible for testing. */
  static sanitizeFileName(A) {
    const I = A.split(/[/\\]/);
    for (let g = I.length - 1; g >= 0; g--) {
      const C = I[g];
      if (C.length > 0 && C !== "." && C !== "..")
        return C;
    }
    return "unnamed_file";
  }
  /**
   * Sanitize a relative directory path by stripping traversal components
   * (`.` and `..`) and absolute path prefixes. Returns undefined if the
   * path is empty after sanitization.
   */
  /** @internal Visible for testing. */
  static sanitizePath(A) {
    const g = A.split(/[/\\]/).filter((C) => C.length > 0 && C !== "." && C !== "..");
    if (g.length > 0 && (g[0] === "?" || g[0] === ".") && (g.shift(), g.length > 0 && /^[A-Za-z]:$/.test(g[0]) && g.shift()), g.length > 0 && /^[A-Za-z]:$/.test(g[0]) && g.shift(), g.length !== 0)
      return g.join("\\");
  }
  handleFileContentsRequest(A) {
    if (this.acknowledgePaste(), !this.uploadState) {
      if (!this.retainedFiles) {
        console.warn("Received file contents request but no upload in progress"), this.sendSubmitFileContents(A.streamId, true, new Uint8Array());
        return;
      }
      this.rebuildUploadStateFromRetained();
    }
    const I = this.uploadState, { files: g, droppedFiles: C } = I;
    if (I.failedFiles.has(A.index)) {
      this.sendSubmitFileContents(A.streamId, true, new Uint8Array());
      return;
    }
    const E = g[A.index], D = C[A.index];
    if (D === void 0) {
      console.error(
        `File index ${A.index} out of range (stream ${A.streamId}, valid: 0..${C.length - 1})`
      ), this.sendSubmitFileContents(A.streamId, true, new Uint8Array());
      return;
    }
    if (E == null) {
      if ((A.flags & t.SIZE) !== 0) {
        const i = new Uint8Array(8);
        this.sendSubmitFileContents(A.streamId, false, i);
      } else
        this.sendSubmitFileContents(A.streamId, true, new Uint8Array());
      return;
    }
    const w = E;
    if ((A.flags & t.SIZE) !== 0) {
      const i = new Uint8Array(8);
      new DataView(i.buffer).setBigUint64(0, BigInt(w.size), true), this.sendSubmitFileContents(A.streamId, false, i), w.size === 0 && this.markUploadFileComplete(A.index, w, I.transferIds.get(A.index) ?? -1);
    } else if ((A.flags & t.RANGE) !== 0) {
      const i = w.slice(A.position, A.position + A.size), y = new FileReader();
      I.activeReaders.set(A.streamId, y);
      const K = setTimeout(() => {
        var _a;
        y.abort(), this.uploadState !== void 0 && (this.uploadState.activeReaders.delete(A.streamId), this.uploadState.readerTimeouts.delete(A.streamId)), this.sendSubmitFileContents(A.streamId, true, new Uint8Array());
        const J = {
          message: `File read timeout after ${_Y.FILE_READER_TIMEOUT_MS / 1e3}s`,
          transferId: (_a = this.uploadState) == null ? void 0 : _a.transferIds.get(A.index),
          fileIndex: A.index,
          fileName: D.name,
          direction: "upload"
        };
        this.emit("error", J), this.uploadState !== void 0 && (this.uploadState.failedFiles.add(A.index), this.uploadState.completedFiles.add(A.index), this.uploadState.completedFiles.size >= this.uploadState.expectedFileCount && this.finishUploadBatch(this.uploadState));
      }, _Y.FILE_READER_TIMEOUT_MS);
      I.readerTimeouts.set(A.streamId, K), y.onload = () => {
        if (this.uploadState !== void 0) {
          this.uploadState.activeReaders.delete(A.streamId);
          const S = this.uploadState.readerTimeouts.get(A.streamId);
          S !== void 0 && (clearTimeout(S), this.uploadState.readerTimeouts.delete(A.streamId));
        }
        const J = new Uint8Array(y.result);
        if (this.sendSubmitFileContents(A.streamId, false, J), this.uploadState !== void 0) {
          const S = (this.uploadState.bytesServed.get(A.index) ?? 0) + J.length;
          this.uploadState.bytesServed.set(A.index, S);
          const $ = this.uploadState.transferIds.get(A.index) ?? -1, oA = {
            transferId: $,
            fileIndex: A.index,
            fileName: D.name,
            bytesTransferred: S,
            totalBytes: w.size,
            percentage: w.size === 0 ? 100 : Math.min(S / w.size * 100, 100)
          };
          this.emit("upload-progress", oA), S >= w.size && this.markUploadFileComplete(A.index, w, $);
        }
      }, y.onerror = () => {
        var _a, _b;
        if (this.uploadState !== void 0) {
          this.uploadState.activeReaders.delete(A.streamId);
          const S = this.uploadState.readerTimeouts.get(A.streamId);
          S !== void 0 && (clearTimeout(S), this.uploadState.readerTimeouts.delete(A.streamId));
        }
        if (((_a = this.uploadState) == null ? void 0 : _a.failedFiles.has(A.index)) === true)
          return;
        this.sendSubmitFileContents(A.streamId, true, new Uint8Array());
        const J = {
          message: "Failed to read file chunk",
          transferId: (_b = this.uploadState) == null ? void 0 : _b.transferIds.get(A.index),
          fileIndex: A.index,
          fileName: D.name,
          direction: "upload",
          cause: y.error
        };
        this.emit("error", J), this.uploadState !== void 0 && (this.uploadState.failedFiles.add(A.index), this.uploadState.completedFiles.add(A.index), this.uploadState.completedFiles.size >= this.uploadState.expectedFileCount && this.finishUploadBatch(this.uploadState));
      }, y.readAsArrayBuffer(i);
    }
  }
  /**
   * Mark a single upload file as fully served: record it, emit upload-complete once, and
   * finalize the batch once every counted file is accounted for. Shared by the RANGE onload
   * path (final chunk served) and the SIZE path for 0-byte files (which get no RANGE request).
   */
  markUploadFileComplete(A, I, g) {
    const C = this.uploadState;
    C === void 0 || C.completedFiles.has(A) || (C.completedFiles.add(A), this.emit("upload-complete", I, A, g), C.completedFiles.size === C.expectedFileCount && this.finishUploadBatch(C));
  }
  /**
   * Lazily rebuild uploadState from retainedFiles when the remote re-pastes
   * after the original upload completed. This lets the main code path in
   * handleFileContentsRequest handle progress and completion identically.
   * No external promise - resolve/reject are no-ops.
   */
  rebuildUploadStateFromRetained() {
    const A = this.retainedFiles, I = /* @__PURE__ */ new Map();
    for (let C = 0; C < A.length; C++)
      I.set(C, this.generateStreamId());
    const g = A.filter((C) => C.isDirectory !== true).length;
    this.uploadState = {
      files: A.map((C) => C.file),
      droppedFiles: A,
      failedFiles: /* @__PURE__ */ new Set(),
      expectedFileCount: g,
      completedFiles: /* @__PURE__ */ new Set(),
      bytesServed: /* @__PURE__ */ new Map(),
      activeReaders: /* @__PURE__ */ new Map(),
      readerTimeouts: /* @__PURE__ */ new Map(),
      transferIds: I,
      resolve: () => {
      },
      reject: () => {
      },
      isRePaste: true
    }, this.emit("upload-batch-started", I, A);
  }
  handleFileContentsResponse(A) {
    const I = this.activeDownloads.get(A.streamId);
    if (!I) {
      console.warn(`Received response for unknown stream ${A.streamId}`);
      return;
    }
    if (A.isError) {
      this.activeDownloads.delete(A.streamId), this.abortWriteHandle(I);
      const g = {
        message: "Remote failed to provide file contents",
        transferId: I.streamId,
        fileIndex: I.fileIndex,
        fileName: I.fileInfo.name,
        direction: "download"
      };
      this.emit("error", g), I.reject(new Error(g.message));
      return;
    }
    if (I.expectedSize === void 0) {
      if (A.data.length < 8) {
        this.activeDownloads.delete(A.streamId), this.abortWriteHandle(I);
        const E = {
          message: "Invalid SIZE response: expected 8 bytes for file size",
          transferId: I.streamId,
          fileIndex: I.fileIndex,
          fileName: I.fileInfo.name,
          direction: "download"
        };
        this.emit("error", E), I.reject(new Error(E.message));
        return;
      }
      const g = new DataView(A.data.buffer, A.data.byteOffset, A.data.byteLength), C = Number(g.getBigUint64(0, true));
      if (C > _Y.MAX_FILE_SIZE) {
        this.activeDownloads.delete(A.streamId), this.abortWriteHandle(I);
        const E = {
          message: `File size ${(C / (1024 * 1024 * 1024)).toFixed(2)}GB exceeds maximum download limit of 2GB`,
          transferId: I.streamId,
          fileIndex: I.fileIndex,
          fileName: I.fileInfo.name,
          direction: "download"
        };
        this.emit("error", E), I.reject(new Error(E.message));
        return;
      }
      if (I.expectedSize = C, C === 0) {
        this.activeDownloads.delete(A.streamId), this.abortWriteHandle(I);
        const E = new Blob([]);
        this.emit("download-complete", I.fileInfo, E, I.fileIndex, I.streamId), I.resolve(E);
        return;
      }
      this.initWriteHandleAndRequestFirstChunk(I);
    } else
      this.handleDataChunk(I, A.data);
  }
  /**
   * Create a write handle for the given transfer and request the first
   * data chunk.  Runs asynchronously because backend initialization
   * (especially OPFS) is async.
   *
   * The init promise is stored on `state.writeHandleReady` so that
   * DATA responses arriving before the handle is ready can await it.
   */
  initWriteHandleAndRequestFirstChunk(A) {
    A.writeHandleReady = (async () => {
      try {
        const I = (async () => (await this.ensureStorageBackend()).createWriteHandle(A.fileInfo.name, A.expectedSize ?? 0))(), g = _Y.WRITE_HANDLE_INIT_TIMEOUT_MS, C = await Promise.race([
          I,
          new Promise(
            (E, D) => setTimeout(() => D(new Error(`Storage init timed out after ${g / 1e3}s`)), g)
          )
        ]);
        if (this.disposed || !this.activeDownloads.has(A.streamId)) {
          try {
            await C.abort();
          } catch {
          }
          return;
        }
        A.writeHandle = C;
      } catch (I) {
        this.activeDownloads.delete(A.streamId);
        const g = {
          message: "Failed to initialize storage for download",
          transferId: A.streamId,
          fileIndex: A.fileIndex,
          fileName: A.fileInfo.name,
          direction: "download",
          cause: I
        };
        this.emit("error", g), A.reject(new Error(g.message, { cause: I }));
        return;
      }
      this.requestNextChunk(A);
    })();
  }
  /**
   * Write a data chunk to the storage backend and advance the download.
   *
   * If the write handle is not yet ready (DATA response arrived before
   * backend init completed), this method awaits `state.writeHandleReady`
   * to preserve chunk ordering -- each concurrent caller awaits the same
   * promise in sequence.
   */
  async handleDataChunk(A, I) {
    if (!A.writeHandle && (!A.writeHandleReady || this.disposed || !this.activeDownloads.has(A.streamId) || (await A.writeHandleReady, this.disposed || !this.activeDownloads.has(A.streamId))))
      return;
    const g = A.writeHandle;
    if (g) {
      try {
        await g.write(I);
      } catch (C) {
        this.activeDownloads.delete(A.streamId), this.abortWriteHandle(A);
        const w = {
          message: C instanceof DOMException && C.name === "QuotaExceededError" ? `Storage quota exceeded while downloading "${A.fileInfo.name}"` : "Failed to write download chunk to storage",
          transferId: A.streamId,
          fileIndex: A.fileIndex,
          fileName: A.fileInfo.name,
          direction: "download",
          cause: C
        };
        this.emit("error", w), A.reject(new Error(w.message, { cause: C }));
        return;
      }
      if (A.bytesReceived += I.length, A.expectedSize !== void 0 && A.bytesReceived > A.expectedSize * 2) {
        this.activeDownloads.delete(A.streamId), this.abortWriteHandle(A);
        const C = {
          message: `Received ${A.bytesReceived} bytes but expected ${A.expectedSize} - aborting`,
          transferId: A.streamId,
          fileIndex: A.fileIndex,
          fileName: A.fileInfo.name,
          direction: "download"
        };
        this.emit("error", C), A.reject(new Error(C.message));
        return;
      }
      if (A.expectedSize !== void 0) {
        const C = {
          transferId: A.streamId,
          fileIndex: A.fileIndex,
          fileName: A.fileInfo.name,
          bytesTransferred: A.bytesReceived,
          totalBytes: A.expectedSize,
          percentage: Math.min(A.bytesReceived / A.expectedSize * 100, 100)
        };
        this.emit("download-progress", C);
      }
      if (A.expectedSize !== void 0 && A.bytesReceived >= A.expectedSize) {
        this.activeDownloads.delete(A.streamId);
        try {
          const C = await g.finalize();
          this.emit("download-complete", A.fileInfo, C, A.fileIndex, A.streamId), A.resolve(C);
        } catch (C) {
          this.abortWriteHandle(A);
          const E = {
            message: "Failed to finalize downloaded file",
            transferId: A.streamId,
            fileIndex: A.fileIndex,
            fileName: A.fileInfo.name,
            direction: "download",
            cause: C
          };
          this.emit("error", E), A.reject(new Error(E.message, { cause: C }));
        }
      } else
        this.requestNextChunk(A);
    }
  }
  /** Abort and clean up a write handle, ignoring errors. */
  async abortWriteHandle(A) {
    if (A.writeHandle) {
      try {
        await A.writeHandle.abort();
      } catch {
      }
      A.writeHandle = void 0;
    }
  }
  /**
   * Handle the remote's response to one of our outbound Format Lists, surfaced via
   * `on_format_list_response`. Always re-emitted as a `format-list-response` event so
   * a frontend can drive paste from it (inject on accept, retry on reject).
   *
   * On reject (`ok === false`) the remote silently discards the advertised clipboard
   * (MS-RDPECLIP), so an upload still waiting to be pulled can never complete --
   * previously this left `uploadState` set and every later upload threw "Upload
   * already in progress". The watchdog-armed check scopes the release to an upload
   * that was advertised but not yet pulled, so re-paste and an already-progressing
   * transfer are left alone.
   */
  handleFormatListResponse(A) {
    this.emit("format-list-response", A), !A && this.pasteAckTimeout !== void 0 && this.failPendingUpload("The remote rejected the file list, so the paste was not accepted");
  }
  handleLock(A) {
  }
  handleUnlock(A) {
  }
  handleLocksExpired(A) {
    const I = /* @__PURE__ */ new Set();
    for (let g = 0; g < A.length; g++)
      I.add(A[g]);
    for (const [g, C] of this.activeDownloads)
      if (C.clipDataId !== void 0 && I.has(C.clipDataId)) {
        this.activeDownloads.delete(g), this.abortWriteHandle(C);
        const E = `File download timed out for "${C.fileInfo.name}". Clipboard lock expired due to inactivity. This can happen with slow network connections or large files. Try downloading smaller files, increasing chunk size, or checking your network connection.`;
        C.reject(new Error(E)), this.emit("error", {
          message: E,
          transferId: C.streamId,
          fileIndex: C.fileIndex,
          fileName: C.fileInfo.name,
          direction: "download"
        });
      }
  }
  // ==================== Helper Methods ====================
  requestNextChunk(A) {
    if (A.expectedSize === void 0 || A.expectedSize === 0)
      return;
    const I = A.bytesReceived, g = A.expectedSize - I, C = Math.min(this.chunkSize, g);
    try {
      this.sendRequestFileContents(
        A.streamId,
        A.fileIndex,
        t.RANGE,
        I,
        C,
        A.clipDataId
      );
    } catch (E) {
      this.activeDownloads.delete(A.streamId), this.abortWriteHandle(A);
      const D = {
        message: "Failed to request file chunk",
        transferId: A.streamId,
        fileIndex: A.fileIndex,
        fileName: A.fileInfo.name,
        direction: "download",
        cause: E
      };
      this.emit("error", D), A.reject(new Error(D.message, { cause: E }));
    }
  }
  generateStreamId() {
    const A = this.activeDownloads.size + 2;
    for (let I = 0; I < A; I++) {
      const g = this.nextStreamId;
      if (this.nextStreamId = (this.nextStreamId + 1) % 4294967296, this.nextStreamId === 0 && (this.nextStreamId = 1), !this.activeDownloads.has(g) && g !== 0)
        return g;
    }
    throw new Error("Unable to generate unique stream ID");
  }
};
/** Maximum file size for downloads (2GB) to prevent browser out-of-memory errors */
__publicField(_Y, "MAX_FILE_SIZE", 2 * 1024 * 1024 * 1024);
/** Timeout for FileReader operations (60 seconds) to prevent stalled uploads */
__publicField(_Y, "FILE_READER_TIMEOUT_MS", 60 * 1e3);
/**
 * How long to keep clipboard monitoring suppressed after advertising an upload
 * while waiting for the remote to pull the files (first FileContentsRequest),
 * before giving up. Matches the Rust cliprdr lock inactivity timeout (60s), so
 * the JS side gives up exactly when the protocol lock does. If the remote never
 * requests contents (the paste landed in a non-file target, or the advertise was
 * clobbered), the watchdog resumes monitoring and fails the upload so its state
 * cannot wedge later uploads.
 */
__publicField(_Y, "PASTE_ACK_TIMEOUT_MS", 60 * 1e3);
/**
 * Upload inactivity window. After the remote starts pulling, each FileContentsRequest
 * resets this; if pulls then stop for this long -- e.g. the remote grabbed the
 * clipboard with a text/image copy that never reaches handleFilesAvailable -- the
 * upload is failed so `uploadState` is released and later uploads aren't wedged. A
 * slow-but-progressing transfer keeps resetting it, so it is never killed.
 */
__publicField(_Y, "UPLOAD_INACTIVITY_TIMEOUT_MS", 60 * 1e3);
/** Timeout for storage backend write handle initialization (30 seconds). */
__publicField(_Y, "WRITE_HANDLE_INIT_TIMEOUT_MS", 30 * 1e3);
/** Maximum recursion depth when traversing dropped directories. */
__publicField(_Y, "MAX_DIRECTORY_DEPTH", 32);
/** Maximum total entries (files + directories) collected from a single drop. */
__publicField(_Y, "MAX_DIRECTORY_ENTRIES", 1e3);
let Y = _Y;
async function yI(Q) {
  await uA(), HA(Q);
}
const RI = {
  DesktopSize: a,
  InputTransaction: r,
  SessionBuilder: M,
  ClipboardData: H,
  DeviceEvent: U
};
function MI(Q) {
  return new F("pcb", Q);
}
function YI(Q, A = "enhanced") {
  if (Q.trim() === "")
    throw new Error("vmconnect requires a VM ID");
  const I = A === "enhanced" ? `${Q};EnhancedMode=1` : Q;
  return new F("vmconnect", I);
}
function UI(Q) {
  return new F("display_control", Q);
}
function hI(Q) {
  return new F("kdc_proxy_url", Q);
}
function JI(Q) {
  return new F("outbound_message_size_limit", Q);
}
function SI(Q) {
  return new F("enable_credssp", Q);
}
function KI(Q) {
  return new F("enable_server_pointer", Q);
}
function LI(Q) {
  return new F("legacy_graphics", Q);
}
function sI(Q) {
  return new F("egfx", Q);
}
function cI(Q) {
  return new F("gfx_session", Q >>> 0);
}
function HI(Q) {
  UA(Q >>> 0);
}
function aI(Q) {
  return new F("avc420_webcodecs", Q);
}
function qI(Q) {
  return new F("avc420_only", Q);
}
function VI(Q) {
  return new F("rdpsnd_audio", Q);
}
function ZI(Q, A) {
  LA(Q >>> 0, A);
}
function pI(Q, A) {
  hA(Q >>> 0, A);
}
function jI(Q, A, I, g, C, E, D, w) {
  yA(Q >>> 0, A, I, g, C, E, D, w);
}
function tI(Q, A = 1) {
  kA(Q >>> 0, A >>> 0);
}
function dI(Q, A) {
  SA(Q >>> 0, A);
}
function WI(Q, A) {
  JA(Q >>> 0, A);
}
function lI(Q, A) {
  sA(Q >>> 0, A);
}
function XI(Q, A) {
  cA(Q >>> 0, A);
}
function OI(Q, A) {
  YA(Q >>> 0, A);
}
function bI(Q, A) {
  KA(Q >>> 0, A);
}
function xI() {
  RA();
}
function fI() {
  return aA();
}
function PI() {
  return MA();
}
export {
  RI as Backend,
  FA as BlobStorageBackend,
  t as FileContentsFlags,
  j as OpfsStorageBackend,
  GI as PrinterDriverName,
  AA as RdpFile,
  Y as RdpFileTransferProvider,
  tI as acknowledgeEgfxPresented,
  jI as applyEgfxRgba,
  qI as avc420Only,
  aI as avc420Webcodecs,
  xI as beginEgfxResizeCapture,
  iI as detectStorageBackend,
  UI as displayControl,
  sI as egfx,
  PI as egfxDiagErrorCount,
  SI as enableCredssp,
  KI as enableServerPointer,
  eA as fileContentsRequestCallback,
  _A as fileContentsResponseCallback,
  vA as filesAvailableCallback,
  cI as gfxSession,
  yI as init,
  BI as initiateFileCopy,
  hI as kdcProxyUrl,
  LI as legacyGraphics,
  $A as lockCallback,
  II as locksExpiredCallback,
  JI as outboundMessageSizeLimit,
  MI as preConnectionBlob,
  NI as printJobStreamCallbacks,
  oI as printerDeviceId,
  kI as printerDriverName,
  FI as printerName,
  OI as pushUdpPayload,
  VI as rdpsndAudio,
  HI as releaseGfxSession,
  QI as requestFileContents,
  pI as setAvc420WebcodecsCallback,
  WI as setEgfxAvcThinClient,
  dI as setEgfxCapsCallback,
  bI as setEgfxResetCallback,
  ZI as setRdpsndWaveCallback,
  lI as setUdpOpenCallback,
  XI as setUdpSendCallback,
  CI as submitFileContents,
  fI as takeEgfxResizeCapture,
  AI as unlockCallback,
  YI as vmConnect
};
