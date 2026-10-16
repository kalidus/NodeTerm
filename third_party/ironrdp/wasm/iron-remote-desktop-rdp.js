var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
class H {
  static __wrap(A) {
    const I = Object.create(H.prototype);
    return I.__wbg_ptr = A, P.register(I, I.__wbg_ptr, I), I;
  }
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, P.unregister(this), A;
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
    const g = k(A, B.__wbindgen_malloc, B.__wbindgen_realloc), Q = G, E = _(I, B.__wbindgen_malloc), D = G;
    B.clipboarddata_addBinary(this.__wbg_ptr, g, Q, E, D);
  }
  /**
   * @param {string} mime_type
   * @param {string} text
   */
  addText(A, I) {
    const g = k(A, B.__wbindgen_malloc, B.__wbindgen_realloc), Q = G, E = k(I, B.__wbindgen_malloc, B.__wbindgen_realloc), D = G;
    B.clipboarddata_addText(this.__wbg_ptr, g, Q, E, D);
  }
  constructor() {
    const A = B.clipboarddata_create();
    return this.__wbg_ptr = A, P.register(this, this.__wbg_ptr, this), this;
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
    var I = lA(A[0], A[1]).slice();
    return B.__wbindgen_free(A[0], A[1] * 4, 4), I;
  }
}
Symbol.dispose && (H.prototype[Symbol.dispose] = H.prototype.free);
class O {
  static __wrap(A) {
    const I = Object.create(O.prototype);
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
      return A = g[0], I = g[1], o(g[0], g[1]);
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
Symbol.dispose && (O.prototype[Symbol.dispose] = O.prototype.free);
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
    NA(I);
    const g = B.deviceevent_unicodePressed(I);
    return U.__wrap(g);
  }
  /**
   * @param {string} unicode
   * @returns {DeviceEvent}
   */
  static unicodeReleased(A) {
    const I = A.codePointAt(0);
    NA(I);
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
    const Q = B.deviceevent_wheelRotations(A, I, g);
    return U.__wrap(Q);
  }
}
Symbol.dispose && (U.prototype[Symbol.dispose] = U.prototype.free);
class F {
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, CA.unregister(this), A;
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
    const g = k(A, B.__wbindgen_malloc, B.__wbindgen_realloc), Q = G, E = B.extension_create(g, Q, I);
    return this.__wbg_ptr = E, CA.register(this, this.__wbg_ptr, this), this;
  }
}
Symbol.dispose && (F.prototype[Symbol.dispose] = F.prototype.free);
class z {
  __destroy_into_raw() {
    const A = this.__wbg_ptr;
    return this.__wbg_ptr = 0, QA.unregister(this), A;
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
    return this.__wbg_ptr = A, QA.register(this, this.__wbg_ptr, this), this;
  }
}
Symbol.dispose && (z.prototype[Symbol.dispose] = z.prototype.free);
class b {
  static __wrap(A) {
    const I = Object.create(b.prototype);
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
      return A = g[0], I = g[1], o(g[0], g[1]);
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
    return A === 0 ? void 0 : m.__wrap(A);
  }
}
Symbol.dispose && (b.prototype[Symbol.dispose] = b.prototype.free);
class m {
  static __wrap(A) {
    const I = Object.create(m.prototype);
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
Symbol.dispose && (m.prototype[Symbol.dispose] = m.prototype.free);
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
    const I = k(A, B.__wbindgen_malloc, B.__wbindgen_realloc), g = G, Q = B.rdpfile_getInt(this.__wbg_ptr, I, g);
    return Q === Number.MAX_SAFE_INTEGER ? void 0 : Q;
  }
  /**
   * @param {string} key
   * @returns {string | undefined}
   */
  getStr(A) {
    const I = k(A, B.__wbindgen_malloc, B.__wbindgen_realloc), g = G, Q = B.rdpfile_getStr(this.__wbg_ptr, I, g);
    let E;
    return Q[0] !== 0 && (E = o(Q[0], Q[1]).slice(), B.__wbindgen_free(Q[0], Q[1] * 1, 1)), E;
  }
  /**
   * @param {string} key
   * @param {number} value
   */
  insertInt(A, I) {
    const g = k(A, B.__wbindgen_malloc, B.__wbindgen_realloc), Q = G;
    B.rdpfile_insertInt(this.__wbg_ptr, g, Q, I);
  }
  /**
   * @param {string} key
   * @param {string} value
   */
  insertStr(A, I) {
    const g = k(A, B.__wbindgen_malloc, B.__wbindgen_realloc), Q = G, E = k(I, B.__wbindgen_malloc, B.__wbindgen_realloc), D = G;
    B.rdpfile_insertStr(this.__wbg_ptr, g, Q, E, D);
  }
  /**
   * @param {string} config
   */
  parse(A) {
    const I = k(A, B.__wbindgen_malloc, B.__wbindgen_realloc), g = G;
    B.rdpfile_parse(this.__wbg_ptr, I, g);
  }
  /**
   * @returns {string}
   */
  write() {
    let A, I;
    try {
      const g = B.rdpfile_write(this.__wbg_ptr);
      return A = g[0], I = g[1], o(g[0], g[1]);
    } finally {
      B.__wbindgen_free(A, I, 1);
    }
  }
}
Symbol.dispose && (AA.prototype[Symbol.dispose] = AA.prototype.free);
class r {
  static __wrap(A) {
    const I = Object.create(r.prototype);
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
    Z(A, z);
    var I = A.__destroy_into_raw();
    const g = B.session_applyInputs(this.__wbg_ptr, I);
    if (g[1])
      throw L(g[0]);
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
      throw L(g[1]);
    return L(g[0]);
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
      throw L(A[0]);
  }
  /**
   * @param {number} width
   * @param {number} height
   * @param {number | null} [scale_factor]
   * @param {number | null} [physical_width]
   * @param {number | null} [physical_height]
   */
  resize(A, I, g, Q, E) {
    B.session_resize(this.__wbg_ptr, A, I, c(g) ? Number.MAX_SAFE_INTEGER : g >>> 0, c(Q) ? Number.MAX_SAFE_INTEGER : Q >>> 0, c(E) ? Number.MAX_SAFE_INTEGER : E >>> 0);
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
      throw L(A[0]);
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
  synchronizeLockKeys(A, I, g, Q) {
    const E = B.session_synchronizeLockKeys(this.__wbg_ptr, A, I, g, Q);
    if (E[1])
      throw L(E[0]);
  }
}
Symbol.dispose && (r.prototype[Symbol.dispose] = r.prototype.free);
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
    const I = k(A, B.__wbindgen_malloc, B.__wbindgen_realloc), g = G, Q = B.sessionbuilder_authToken(this.__wbg_ptr, I, g);
    return M.__wrap(Q);
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
    const I = k(A, B.__wbindgen_malloc, B.__wbindgen_realloc), g = G, Q = B.sessionbuilder_destination(this.__wbg_ptr, I, g);
    return M.__wrap(Q);
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
    const I = k(A, B.__wbindgen_malloc, B.__wbindgen_realloc), g = G, Q = B.sessionbuilder_password(this.__wbg_ptr, I, g);
    return M.__wrap(Q);
  }
  /**
   * @param {string} address
   * @returns {SessionBuilder}
   */
  proxyAddress(A) {
    const I = k(A, B.__wbindgen_malloc, B.__wbindgen_realloc), g = G, Q = B.sessionbuilder_proxyAddress(this.__wbg_ptr, I, g);
    return M.__wrap(Q);
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
    const I = k(A, B.__wbindgen_malloc, B.__wbindgen_realloc), g = G, Q = B.sessionbuilder_serverDomain(this.__wbg_ptr, I, g);
    return M.__wrap(Q);
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
    const I = k(A, B.__wbindgen_malloc, B.__wbindgen_realloc), g = G, Q = B.sessionbuilder_username(this.__wbg_ptr, I, g);
    return M.__wrap(Q);
  }
}
Symbol.dispose && (M.prototype[Symbol.dispose] = M.prototype.free);
class f {
  static __wrap(A) {
    const I = Object.create(f.prototype);
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
      return A = g[0], I = g[1], o(g[0], g[1]);
    } finally {
      B.__wbindgen_free(A, I, 1);
    }
  }
}
Symbol.dispose && (f.prototype[Symbol.dispose] = f.prototype.free);
function oA(C) {
  B.acknowledge_egfx_presented(C);
}
function yA(C, A, I, g, Q, E, D) {
  const w = _(D, B.__wbindgen_malloc), i = G;
  B.apply_egfx_rgba(C, A, I, g, Q, E, w, i);
}
function MA() {
  B.begin_egfx_resize_capture();
}
function RA() {
  return B.egfx_diag_error_count() >>> 0;
}
function YA(C) {
  const A = _(C, B.__wbindgen_malloc), I = G;
  B.push_udp_payload(A, I);
}
function UA(C) {
  B.set_avc420_webcodecs_callback(C);
}
function cA(C) {
  B.set_egfx_avc_thin_client(C);
}
function KA(C) {
  B.set_egfx_caps_callback(C);
}
function JA(C) {
  B.set_egfx_reset_callback(C);
}
function hA(C) {
  B.set_rdpsnd_wave_callback(C);
}
function SA(C) {
  B.set_udp_open_callback(C);
}
function sA(C) {
  B.set_udp_send_callback(C);
}
function LA(C) {
  const A = k(C, B.__wbindgen_malloc, B.__wbindgen_realloc), I = G;
  B.setup(A, I);
}
function HA() {
  return B.take_egfx_resize_capture();
}
function aA() {
  return {
    __proto__: null,
    "./ironrdp_web_bg.js": {
      __proto__: null,
      __wbg___wbindgen_boolean_get_fa956cfa2d1bd751: function(A) {
        const I = A, g = typeof I == "boolean" ? I : void 0;
        return c(g) ? 16777215 : g ? 1 : 0;
      },
      __wbg___wbindgen_debug_string_c25d447a39f5578f: function(A, I) {
        const g = v(I), Q = k(g, B.__wbindgen_malloc, B.__wbindgen_realloc), E = G;
        y().setInt32(A + 4, E, true), y().setInt32(A + 0, Q, true);
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
        const g = I, Q = typeof g == "number" ? g : void 0;
        y().setFloat64(A + 8, c(Q) ? 0 : Q, true), y().setInt32(A + 0, !c(Q), true);
      },
      __wbg___wbindgen_string_get_b0ca35b86a603356: function(A, I) {
        const g = I, Q = typeof g == "string" ? g : void 0;
        var E = c(Q) ? 0 : k(Q, B.__wbindgen_malloc, B.__wbindgen_realloc), D = G;
        y().setInt32(A + 4, D, true), y().setInt32(A + 0, E, true);
      },
      __wbg___wbindgen_throw_344f42d3211c4765: function(A, I) {
        throw new Error(o(A, I));
      },
      __wbg__wbg_cb_unref_fffb441def202758: function(A) {
        A._wbg_cb_unref();
      },
      __wbg_addEventListener_520e749bbae24529: function() {
        return N(function(A, I, g, Q, E) {
          A.addEventListener(o(I, g), Q, E);
        }, arguments);
      },
      __wbg_addEventListener_d85450ee1320c989: function() {
        return N(function(A, I, g, Q) {
          A.addEventListener(o(I, g), Q);
        }, arguments);
      },
      __wbg_apply_3ac86a26fdb56c05: function() {
        return N(function(A, I, g) {
          return A.apply(I, g);
        }, arguments);
      },
      __wbg_arrayBuffer_3b637f0fa65c5351: function() {
        return N(function(A) {
          return A.arrayBuffer();
        }, arguments);
      },
      __wbg_call_8a2dd23819f8a60a: function() {
        return N(function(A, I) {
          return A.call(I);
        }, arguments);
      },
      __wbg_call_a6e5c5dce5018821: function() {
        return N(function(A, I, g) {
          return A.call(I, g);
        }, arguments);
      },
      __wbg_call_e3b662382210db98: function() {
        return N(function(A, I, g, Q) {
          return A.call(I, g, Q);
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
        return O.__wrap(A);
      },
      __wbg_close_c65ca0257e895318: function() {
        return N(function(A) {
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
        return N(function(A, I) {
          return A.dispatchEvent(I);
        }, arguments);
      },
      __wbg_error_744744ff0c9861e6: function(A) {
        console.error(A);
      },
      __wbg_error_a6fa202b58aa1cd3: function(A, I) {
        let g, Q;
        try {
          g = A, Q = I, console.error(o(A, I));
        } finally {
          B.__wbindgen_free(g, Q, 1);
        }
      },
      __wbg_fetch_9b478faef8cda538: function(A) {
        return fetch(A);
      },
      __wbg_from_13e323c65fc8f464: function(A) {
        return Array.from(A);
      },
      __wbg_getContext_e79ddf6a9cb3cc76: function() {
        return N(function(A, I, g) {
          const Q = A.getContext(o(I, g));
          return c(Q) ? 0 : S(Q);
        }, arguments);
      },
      __wbg_getRandomValues_3f44b700395062e5: function() {
        return N(function(A, I) {
          globalThis.crypto.getRandomValues(q(A, I));
        }, arguments);
      },
      __wbg_getRandomValues_bf16787eede473f5: function() {
        return N(function(A, I) {
          globalThis.crypto.getRandomValues(q(A, I));
        }, arguments);
      },
      __wbg_getRandomValues_cc7f052a444bb2ce: function() {
        return N(function(A, I) {
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
        return N(function(A, I) {
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
        return b.__wrap(A);
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
        return N(function(A, I) {
          return new URL(o(A, I));
        }, arguments);
      },
      __wbg_new_0_3da9e97f24fc69be: function() {
        return /* @__PURE__ */ new Date();
      },
      __wbg_new_0d809930cd1354c6: function() {
        return N(function() {
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
        return N(function(A, I) {
          return new WebSocket(o(A, I));
        }, arguments);
      },
      __wbg_new_cd45aabdf6073e84: function(A) {
        return new Uint8Array(A);
      },
      __wbg_new_da52cf8fe3429cb2: function() {
        return new Object();
      },
      __wbg_new_f0787df90791d9ba: function() {
        return N(function() {
          return new URLSearchParams();
        }, arguments);
      },
      __wbg_new_from_slice_7568ba55b4a7e81f: function(A, I) {
        return new Uint32Array(xA(A, I));
      },
      __wbg_new_from_slice_77cdfb7977362f3c: function(A, I) {
        return new Uint8Array(q(A, I));
      },
      __wbg_new_typed_1824d93f294193e5: function(A, I) {
        try {
          var g = { a: A, b: I }, Q = (D, w) => {
            const i = g.a;
            g.a = 0;
            try {
              return tA(i, g.b, D, w);
            } finally {
              g.a = i;
            }
          };
          return new Promise(Q);
        } finally {
          g.a = 0;
        }
      },
      __wbg_new_with_event_init_dict_7b62c0f9fb241877: function() {
        return N(function(A, I, g) {
          return new CloseEvent(o(A, I), g);
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
        return N(function(A, I) {
          return new Request(o(A, I));
        }, arguments);
      },
      __wbg_new_with_str_and_init_d95cbe11ce28e65e: function() {
        return N(function(A, I, g) {
          return new Request(o(A, I), g);
        }, arguments);
      },
      __wbg_new_with_u8_array_sequence_bdda73b0f202f149: function() {
        return N(function(A) {
          return new Blob(A);
        }, arguments);
      },
      __wbg_new_with_u8_clamped_array_and_sh_2767e4741c267d25: function() {
        return N(function(A, I, g, Q) {
          return new ImageData(OA(A, I), g >>> 0, Q >>> 0);
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
        return c(I) ? 0 : S(I);
      },
      __wbg_performance_3fcf6e32a7e1ed0a: function(A) {
        return A.performance;
      },
      __wbg_prototypesetcall_4770620bbe4688a0: function(A, I, g) {
        Uint8Array.prototype.set.call(q(A, I), g);
      },
      __wbg_push_d2ae3af0c1217ae6: function(A, I) {
        return A.push(I);
      },
      __wbg_putImageData_a4dee11e08ab9ac8: function() {
        return N(function(A, I, g, Q) {
          A.putImageData(I, g, Q);
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
        const g = I.reason, Q = k(g, B.__wbindgen_malloc, B.__wbindgen_realloc), E = G;
        y().setInt32(A + 4, E, true), y().setInt32(A + 0, Q, true);
      },
      __wbg_removeEventListener_a3f23c70077bdcc1: function() {
        return N(function(A, I, g, Q) {
          A.removeEventListener(o(I, g), Q);
        }, arguments);
      },
      __wbg_resolve_2191a4dfe481c25b: function(A) {
        return Promise.resolve(A);
      },
      __wbg_search_c905fb82fd20bc6b: function(A, I) {
        const g = I.search, Q = k(g, B.__wbindgen_malloc, B.__wbindgen_realloc), E = G;
        y().setInt32(A + 4, E, true), y().setInt32(A + 0, Q, true);
      },
      __wbg_send_1733c45567a373ff: function() {
        return N(function(A, I) {
          A.send(I);
        }, arguments);
      },
      __wbg_send_df98dd5ede9b3f4d: function() {
        return N(function(A, I, g) {
          A.send(o(I, g));
        }, arguments);
      },
      __wbg_session_new: function(A) {
        return r.__wrap(A);
      },
      __wbg_sessionterminationinfo_new: function(A) {
        return f.__wrap(A);
      },
      __wbg_setInterval_cbf1c35c6a692d37: function() {
        return N(function(A, I) {
          return setInterval(A, I);
        }, arguments);
      },
      __wbg_setTimeout_56bcdccbad22fd44: function() {
        return N(function(A, I) {
          return setTimeout(A, I);
        }, arguments);
      },
      __wbg_set_0de9c62c23d04ad5: function() {
        return N(function(A, I, g, Q, E) {
          A.set(o(I, g), o(Q, E));
        }, arguments);
      },
      __wbg_set_4d7dd76f3dae2926: function(A, I, g) {
        A.set(q(I, g));
      },
      __wbg_set_8535240470bf2500: function() {
        return N(function(A, I, g) {
          return Reflect.set(A, I, g);
        }, arguments);
      },
      __wbg_set_8a16b38e4805b298: function(A, I, g) {
        A[I >>> 0] = g;
      },
      __wbg_set_binaryType_a37b086c78ca7c29: function(A, I) {
        A.binaryType = WA[I];
      },
      __wbg_set_body_029f2d171e0a005f: function(A, I) {
        A.body = I;
      },
      __wbg_set_code_9d09aecd77d789f4: function(A, I) {
        A.code = I;
      },
      __wbg_set_fc6febdf1ddac5c2: function(A, I, g) {
        A.set(XA(I, g));
      },
      __wbg_set_headers_9c61d123c3ee1f10: function(A, I) {
        A.headers = I;
      },
      __wbg_set_height_7d9d8f892e6964c6: function(A, I) {
        A.height = I >>> 0;
      },
      __wbg_set_method_5532d59b92d76467: function(A, I, g) {
        A.method = o(I, g);
      },
      __wbg_set_once_51a9fb6b8af8a72b: function(A, I) {
        A.once = I !== 0;
      },
      __wbg_set_reason_18dc06ea0d60243b: function(A, I, g) {
        A.reason = o(I, g);
      },
      __wbg_set_search_f9700de567764208: function(A, I, g) {
        A.search = o(I, g);
      },
      __wbg_set_width_8e30d010cd66830d: function(A, I) {
        A.width = I >>> 0;
      },
      __wbg_stack_3b0d974bbf31e44f: function(A, I) {
        const g = I.stack, Q = k(g, B.__wbindgen_malloc, B.__wbindgen_realloc), E = G;
        y().setInt32(A + 4, E, true), y().setInt32(A + 0, Q, true);
      },
      __wbg_static_accessor_GLOBAL_4ef717fb391d88b7: function() {
        const A = typeof global > "u" ? null : global;
        return c(A) ? 0 : S(A);
      },
      __wbg_static_accessor_GLOBAL_THIS_8d1badc68b5a74f4: function() {
        const A = typeof globalThis > "u" ? null : globalThis;
        return c(A) ? 0 : S(A);
      },
      __wbg_static_accessor_SELF_146583524fe1469b: function() {
        const A = typeof self > "u" ? null : self;
        return c(A) ? 0 : S(A);
      },
      __wbg_static_accessor_WINDOW_f2829a2234d7819e: function() {
        const A = typeof window > "u" ? null : window;
        return c(A) ? 0 : S(A);
      },
      __wbg_statusText_9f08c32741a99815: function(A, I) {
        const g = I.statusText, Q = k(g, B.__wbindgen_malloc, B.__wbindgen_realloc), E = G;
        y().setInt32(A + 4, E, true), y().setInt32(A + 0, Q, true);
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
        const g = I.url, Q = k(g, B.__wbindgen_malloc, B.__wbindgen_realloc), E = G;
        y().setInt32(A + 4, E, true), y().setInt32(A + 0, Q, true);
      },
      __wbg_userAgent_0558f0ac642f7771: function() {
        return N(function(A, I) {
          const g = I.userAgent, Q = k(g, B.__wbindgen_malloc, B.__wbindgen_realloc), E = G;
          y().setInt32(A + 4, E, true), y().setInt32(A + 0, Q, true);
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
        return p(A, I, dA);
      },
      __wbindgen_cast_0000000000000002: function(A, I) {
        return p(A, I, ZA);
      },
      __wbindgen_cast_0000000000000003: function(A, I) {
        return p(A, I, jA);
      },
      __wbindgen_cast_0000000000000004: function(A, I) {
        return p(A, I, VA);
      },
      __wbindgen_cast_0000000000000005: function(A, I) {
        return p(A, I, qA);
      },
      __wbindgen_cast_0000000000000006: function(A, I) {
        return p(A, I, pA);
      },
      __wbindgen_cast_0000000000000007: function(A) {
        return A;
      },
      __wbindgen_cast_0000000000000008: function(A, I) {
        return o(A, I);
      },
      __wbindgen_init_externref_table: function() {
        const A = B.__wbindgen_externrefs, I = A.grow(4);
        A.set(0, void 0), A.set(I + 0, void 0), A.set(I + 1, null), A.set(I + 2, true), A.set(I + 3, false);
      }
    }
  };
}
function qA(C, A) {
  B.wasm_bindgen_f8ac39c25d0db1d6___convert__closures_____invoke_______true_(C, A);
}
function pA(C, A) {
  B.wasm_bindgen_f8ac39c25d0db1d6___convert__closures_____invoke_______true__1_(C, A);
}
function ZA(C, A, I) {
  B.wasm_bindgen_f8ac39c25d0db1d6___convert__closures_____invoke___web_sys_9db305dc7f1ecea8___features__gen_CloseEvent__CloseEvent______true_(C, A, I);
}
function jA(C, A, I) {
  B.wasm_bindgen_f8ac39c25d0db1d6___convert__closures_____invoke___web_sys_9db305dc7f1ecea8___features__gen_CloseEvent__CloseEvent______true__2(C, A, I);
}
function VA(C, A, I) {
  B.wasm_bindgen_f8ac39c25d0db1d6___convert__closures_____invoke___web_sys_9db305dc7f1ecea8___features__gen_CloseEvent__CloseEvent______true__3(C, A, I);
}
function dA(C, A, I) {
  const g = B.wasm_bindgen_f8ac39c25d0db1d6___convert__closures_____invoke___wasm_bindgen_f8ac39c25d0db1d6___JsValue__core_608f92abc48d28da___result__Result_____wasm_bindgen_f8ac39c25d0db1d6___JsError___true_(C, A, I);
  if (g[1])
    throw L(g[0]);
}
function tA(C, A, I, g) {
  B.wasm_bindgen_f8ac39c25d0db1d6___convert__closures_____invoke___js_sys_e09276f0a184f3dc___Function_fn_wasm_bindgen_f8ac39c25d0db1d6___JsValue_____wasm_bindgen_f8ac39c25d0db1d6___sys__Undefined___js_sys_e09276f0a184f3dc___Function_fn_wasm_bindgen_f8ac39c25d0db1d6___JsValue_____wasm_bindgen_f8ac39c25d0db1d6___sys__Undefined_______true_(C, A, I, g);
}
const WA = ["blob", "arraybuffer"], P = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((C) => B.__wbg_clipboarddata_free(C, 1)), IA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((C) => B.__wbg_clipboarditem_free(C, 1)), n = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((C) => B.__wbg_desktopsize_free(C, 1)), gA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((C) => B.__wbg_deviceevent_free(C, 1)), CA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((C) => B.__wbg_extension_free(C, 1)), QA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((C) => B.__wbg_inputtransaction_free(C, 1)), BA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((C) => B.__wbg_ironerror_free(C, 1)), EA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((C) => B.__wbg_rdcleanpathdetails_free(C, 1)), DA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((C) => B.__wbg_rdpfile_free(C, 1)), wA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((C) => B.__wbg_session_free(C, 1)), u = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((C) => B.__wbg_sessionbuilder_free(C, 1)), iA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((C) => B.__wbg_sessionterminationinfo_free(C, 1));
function S(C) {
  const A = B.__externref_table_alloc();
  return B.__wbindgen_externrefs.set(A, C), A;
}
function NA(C) {
  if (typeof C == "number" && (C >= 1114112 || C >= 55296 && C < 57344)) throw new Error(`expected a valid Unicode scalar value, found ${C}`);
}
function Z(C, A) {
  if (!(C instanceof A))
    throw new Error(`expected instance of ${A.name}`);
}
const GA = typeof FinalizationRegistry > "u" ? { register: () => {
}, unregister: () => {
} } : new FinalizationRegistry((C) => B.__wbindgen_destroy_closure(C.a, C.b));
function v(C) {
  const A = typeof C;
  if (A == "number" || A == "boolean" || C == null)
    return `${C}`;
  if (A == "string")
    return `"${C}"`;
  if (A == "symbol") {
    const Q = C.description;
    return Q == null ? "Symbol" : `Symbol(${Q})`;
  }
  if (A == "function") {
    const Q = C.name;
    return typeof Q == "string" && Q.length > 0 ? `Function(${Q})` : "Function";
  }
  if (Array.isArray(C)) {
    const Q = C.length;
    let E = "[";
    Q > 0 && (E += v(C[0]));
    for (let D = 1; D < Q; D++)
      E += ", " + v(C[D]);
    return E += "]", E;
  }
  const I = /\[object ([^\]]+)\]/.exec(toString.call(C));
  let g;
  if (I && I.length > 1)
    g = I[1];
  else
    return toString.call(C);
  if (g == "Object")
    try {
      return "Object(" + JSON.stringify(C) + ")";
    } catch {
      return "Object";
    }
  return C instanceof Error ? `${C.name}: ${C.message}
${C.stack}` : g;
}
function lA(C, A) {
  C = C >>> 0;
  const I = y(), g = [];
  for (let Q = C; Q < C + 4 * A; Q += 4)
    g.push(B.__wbindgen_externrefs.get(I.getUint32(Q, true)));
  return B.__externref_drop_slice(C, A), g;
}
function XA(C, A) {
  return C = C >>> 0, bA().subarray(C / 2, C / 2 + A);
}
function xA(C, A) {
  return C = C >>> 0, mA().subarray(C / 4, C / 4 + A);
}
function q(C, A) {
  return C = C >>> 0, j().subarray(C / 1, C / 1 + A);
}
function OA(C, A) {
  return C = C >>> 0, rA().subarray(C / 1, C / 1 + A);
}
let s = null;
function y() {
  return (s === null || s.buffer.detached === true || s.buffer.detached === void 0 && s.buffer !== B.memory.buffer) && (s = new DataView(B.memory.buffer)), s;
}
function o(C, A) {
  return TA(C >>> 0, A);
}
let t = null;
function bA() {
  return (t === null || t.byteLength === 0) && (t = new Uint16Array(B.memory.buffer)), t;
}
let W = null;
function mA() {
  return (W === null || W.byteLength === 0) && (W = new Uint32Array(B.memory.buffer)), W;
}
let l = null;
function j() {
  return (l === null || l.byteLength === 0) && (l = new Uint8Array(B.memory.buffer)), l;
}
let X = null;
function rA() {
  return (X === null || X.byteLength === 0) && (X = new Uint8ClampedArray(B.memory.buffer)), X;
}
function N(C, A) {
  try {
    return C.apply(this, A);
  } catch (I) {
    const g = S(I);
    B.__wbindgen_exn_store(g);
  }
}
function c(C) {
  return C == null;
}
function p(C, A, I) {
  const g = { a: C, b: A, cnt: 1 }, Q = (...E) => {
    g.cnt++;
    const D = g.a;
    g.a = 0;
    try {
      return I(D, g.b, ...E);
    } finally {
      g.a = D, Q._wbg_cb_unref();
    }
  };
  return Q._wbg_cb_unref = () => {
    --g.cnt === 0 && (B.__wbindgen_destroy_closure(g.a, g.b), g.a = 0, GA.unregister(g));
  }, GA.register(Q, g, g), Q;
}
function _(C, A) {
  const I = A(C.length * 1, 1) >>> 0;
  return j().set(C, I / 1), G = C.length, I;
}
function k(C, A, I) {
  if (I === void 0) {
    const w = x.encode(C), i = A(w.length, 1) >>> 0;
    return j().subarray(i, i + w.length).set(w), G = w.length, i;
  }
  let g = C.length, Q = A(g, 1) >>> 0;
  const E = j();
  let D = 0;
  for (; D < g; D++) {
    const w = C.charCodeAt(D);
    if (w > 127) break;
    E[Q + D] = w;
  }
  if (D !== g) {
    D !== 0 && (C = C.slice(D)), Q = I(Q, g, g = D + C.length * 3, 1) >>> 0;
    const w = j().subarray(Q + D, Q + g), i = x.encodeInto(C, w);
    D += i.written, Q = I(Q, g, D, 1) >>> 0;
  }
  return G = D, Q;
}
function L(C) {
  const A = B.__wbindgen_externrefs.get(C);
  return B.__externref_table_dealloc(C), A;
}
let T = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
T.decode();
const fA = 2146435072;
let e = 0;
function TA(C, A) {
  return e += A, e >= fA && (T = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true }), T.decode(), e = A), T.decode(j().subarray(C, C + A));
}
const x = new TextEncoder();
"encodeInto" in x || (x.encodeInto = function(C, A) {
  const I = x.encode(C);
  return A.set(I), {
    read: C.length,
    written: I.length
  };
});
let G = 0, B;
function zA(C, A) {
  return B = C.exports, s = null, t = null, W = null, l = null, X = null, B.__wbindgen_start(), B;
}
async function PA(C, A) {
  if (typeof Response == "function" && C instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming == "function")
      try {
        return await WebAssembly.instantiateStreaming(C, A);
      } catch (Q) {
        if (C.ok && I(C.type) && C.headers.get("Content-Type") !== "application/wasm")
          console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", Q);
        else
          throw Q;
      }
    const g = await C.arrayBuffer();
    return await WebAssembly.instantiate(g, A);
  } else {
    const g = await WebAssembly.instantiate(C, A);
    return g instanceof WebAssembly.Instance ? { instance: g, module: C } : g;
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
async function nA(C) {
  if (B !== void 0) return B;
  C !== void 0 && (Object.getPrototypeOf(C) === Object.prototype ? { module_or_path: C } = C : console.warn("using deprecated parameters for the initialization function; pass a single object instead")), C === void 0 && (C = new URL("./iron-remote-desktop-rdp_bg.wasm", import.meta.url));
  const A = aA();
  (typeof C == "string" || typeof Request == "function" && C instanceof Request || typeof URL == "function" && C instanceof URL) && (C = fetch(C));
  const { instance: I, module: g } = await PA(await C, A);
  return zA(I);
}
const d = {
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
function uA(C) {
  return new F("files_available_callback", C);
}
function eA(C) {
  return new F("file_contents_request_callback", C);
}
function vA(C) {
  return new F("file_contents_response_callback", C);
}
function _A(C) {
  return new F("lock_callback", C);
}
function $A(C) {
  return new F("unlock_callback", C);
}
function AI(C) {
  return new F("locks_expired_callback", C);
}
function II(C) {
  return new F("format_list_response_callback", C);
}
const iI = {
  PostScript: "MS Publisher Imagesetter",
  MicrosoftPrintToPdf: "Microsoft Print to PDF"
};
function NI(C) {
  return new F("print_job_stream_callbacks", C);
}
function GI(C) {
  return new F("printer_name", C);
}
function FI(C) {
  return new F("printer_device_id", C);
}
function kI(C) {
  return new F("printer_driver_name", C);
}
function gI(C) {
  return new F("request_file_contents", C);
}
function CI(C) {
  return new F("submit_file_contents", C);
}
function QI(C) {
  return new F("initiate_file_copy", C);
}
class BI {
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
    return new BI();
  }
  async dispose() {
  }
}
class EI {
  constructor(A, I, g, Q) {
    __publicField(this, "writable");
    __publicField(this, "_bytesWritten", 0);
    __publicField(this, "finalized", false);
    this.fileHandle = A, this.sessionDir = I, this.entryName = g, this.writable = Q;
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
const _V = class _V {
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
    const g = I ?? `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, Q = await A.getDirectoryHandle("ironrdp-transfers", { create: true }), E = await Q.getDirectoryHandle(g, { create: true });
    return _V.cleanupStale(Q, g), new _V(A, E, g);
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
      for await (const Q of A.keys()) {
        if (Q === I)
          continue;
        const E = /^s-(\d+)-/.exec(Q);
        if (!E)
          continue;
        const D = Number(E[1]);
        if (g - D > _V.STALE_SESSION_THRESHOLD_MS)
          try {
            await A.removeEntry(Q, { recursive: true });
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
    const Q = `${this.sequence++}-${DI(A)}`, E = await this.sessionDir.getFileHandle(Q, { create: true }), D = await E.createWritable();
    return new EI(E, this.sessionDir, Q, D);
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
      for await (const Q of I.values()) {
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
__publicField(_V, "STALE_SESSION_THRESHOLD_MS", 1440 * 60 * 1e3);
let V = _V;
function DI(C) {
  let A = C.replace(/[\u0000-\u001f]/g, "");
  A = A.replace(/[/\\]/g, "_"), A = A.replace(/^\.+/, ""), A.length === 0 && (A = "unnamed");
  const I = new TextEncoder();
  if (I.encode(A).byteLength > 200) {
    for (; I.encode(A).byteLength > 200; )
      A = A.slice(0, -1);
    A.length === 0 && (A = "unnamed");
  }
  return A;
}
async function wI(C = "auto", A) {
  var _a, _b;
  if (C === "blob")
    return new FA();
  if (typeof ((_b = (_a = globalThis.navigator) == null ? void 0 : _a.storage) == null ? void 0 : _b.getDirectory) == "function")
    try {
      const I = await navigator.storage.getDirectory();
      if (await V.probe(I))
        return V.create(I, A);
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
    return this.storageBackend ? this.storageBackend : (this.storageBackendReady || (this.storageBackendReady = wI(this.storagePreference).then((A) => (this.storageBackend = A, console.debug(`File transfer storage: ${A.name}`), A)).catch((A) => {
      throw this.storageBackendReady = void 0, A;
    })), this.storageBackendReady);
  }
  // --- Extension-based session method wrappers ---
  // These replace direct session.requestFileContents() etc. calls
  // with invokeExtension() to keep the Session interface protocol-agnostic.
  sendRequestFileContents(A, I, g, Q, E, D) {
    this.ensureSession().invokeExtension(
      gI({
        stream_id: A,
        file_index: I,
        flags: g,
        position: Q,
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
    this.ensureSession().invokeExtension(QI(A));
  }
  /**
   * Returns the extension objects to register on the SessionBuilder before connect().
   * Implements the FileTransferProvider interface.
   */
  getBuilderExtensions() {
    return [
      uA(
        (A, I) => this.handleFilesAvailable(A, I)
      ),
      eA((A) => this.handleFileContentsRequest(A)),
      vA((A) => this.handleFileContentsResponse(A)),
      _A((A) => this.handleLock(A)),
      $A((A) => this.handleUnlock(A)),
      AI((A) => this.handleLocksExpired(A)),
      II((A) => this.handleFormatListResponse(A))
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
      for (const Q of g)
        try {
          Q(...I);
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
    const g = this.generateStreamId(), Q = this.executeDownload(A, I, g);
    return { transferId: g, completion: Q };
  }
  /**
   * Internal: execute the async download workflow for a single file.
   */
  async executeDownload(A, I, g) {
    const Q = this.clipDataId, E = new Promise((D, w) => {
      const i = {
        fileInfo: A,
        fileIndex: I,
        streamId: g,
        clipDataId: Q,
        bytesReceived: 0,
        resolve: D,
        reject: w
      };
      this.activeDownloads.set(g, i);
    });
    try {
      this.sendRequestFileContents(g, I, d.SIZE, 0, 8, Q);
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
      const g = A[I], { transferId: Q, completion: E } = this.downloadFile(g, I), D = await E;
      yield { file: g, blob: D, transferId: Q };
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
    const g = I.maxConcurrent ?? 3, Q = /* @__PURE__ */ new Map(), E = [], D = A.map((i, R) => async () => {
      try {
        const { completion: h } = this.downloadFile(i, R), K = await h;
        Q.set(R, K);
      } catch (h) {
        E.push({ index: R, error: h });
      }
    }), w = [];
    for (const i of D) {
      const R = i().finally(() => {
        w.splice(w.indexOf(R), 1);
      });
      w.push(R), w.length >= g && await Promise.race(w);
    }
    if (await Promise.all(w), E.length > 0)
      throw new Error(
        `Failed to download ${E.length} file(s): ` + E.map((i) => `file ${i.index}: ${i.error}`).join(", ")
      );
    return Q;
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
    const Q = I.map((i) => ({
      name: i.name,
      size: i.size,
      lastModified: i.lastModified,
      path: i.path,
      isDirectory: i.isDirectory
    })), E = I.filter((i) => i.isDirectory !== true).length, D = I.map((i) => i.file), w = new Promise((i, R) => {
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
        reject: R
      }, this.suppressUploadMonitoring();
      try {
        this.sendInitiateFileCopy(Q), this.emit("upload-batch-started", g, I);
      } catch (h) {
        this.uploadState = void 0, this.resumeUploadMonitoring();
        const K = {
          message: "Failed to initiate file upload",
          direction: "upload",
          cause: h
        };
        this.emit("error", K), R(new Error(K.message, { cause: h }));
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
    const { reject: Q } = I;
    this.uploadState = void 0, Q(new Error(A));
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
      let Q = false;
      const E = () => {
        Q || (Q = true, g.parentNode && document.body.removeChild(g));
      };
      g.addEventListener("cancel", () => {
        E(), window.removeEventListener("focus", D), I([]);
      });
      const D = () => {
        setTimeout(() => {
          Q || (E(), I([])), window.removeEventListener("focus", D);
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
      const g = [], Q = [];
      for (const E of A.dataTransfer.items) {
        if (E.kind !== "file") continue;
        const D = (_b = E.webkitGetAsEntry) == null ? void 0 : _b.call(E);
        if (D)
          g.push(D);
        else {
          const w = E.getAsFile();
          w && Q.push(w);
        }
      }
      for (const E of g)
        await this.traverseEntry(E, void 0, I, 0);
      for (const E of Q)
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
  async traverseEntry(A, I, g, Q) {
    if (!(g.length >= _Y.MAX_DIRECTORY_ENTRIES)) {
      if (Q > _Y.MAX_DIRECTORY_DEPTH) {
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
          await this.traverseEntry(i, E, g, Q + 1);
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
      const Q = [], E = () => {
        A.readEntries((D) => {
          D.length === 0 ? I(Q) : (Q.push(...D), E());
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
    const g = A.map((Q) => ({
      ...Q,
      name: _Y.sanitizeFileName(Q.name),
      path: Q.path !== void 0 ? _Y.sanitizePath(Q.path) : void 0
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
      const Q = I[g];
      if (Q.length > 0 && Q !== "." && Q !== "..")
        return Q;
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
    const g = A.split(/[/\\]/).filter((Q) => Q.length > 0 && Q !== "." && Q !== "..");
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
    const I = this.uploadState, { files: g, droppedFiles: Q } = I;
    if (I.failedFiles.has(A.index)) {
      this.sendSubmitFileContents(A.streamId, true, new Uint8Array());
      return;
    }
    const E = g[A.index], D = Q[A.index];
    if (D === void 0) {
      console.error(
        `File index ${A.index} out of range (stream ${A.streamId}, valid: 0..${Q.length - 1})`
      ), this.sendSubmitFileContents(A.streamId, true, new Uint8Array());
      return;
    }
    if (E == null) {
      if ((A.flags & d.SIZE) !== 0) {
        const i = new Uint8Array(8);
        this.sendSubmitFileContents(A.streamId, false, i);
      } else
        this.sendSubmitFileContents(A.streamId, true, new Uint8Array());
      return;
    }
    const w = E;
    if ((A.flags & d.SIZE) !== 0) {
      const i = new Uint8Array(8);
      new DataView(i.buffer).setBigUint64(0, BigInt(w.size), true), this.sendSubmitFileContents(A.streamId, false, i), w.size === 0 && this.markUploadFileComplete(A.index, w, I.transferIds.get(A.index) ?? -1);
    } else if ((A.flags & d.RANGE) !== 0) {
      const i = w.slice(A.position, A.position + A.size), R = new FileReader();
      I.activeReaders.set(A.streamId, R);
      const h = setTimeout(() => {
        var _a;
        R.abort(), this.uploadState !== void 0 && (this.uploadState.activeReaders.delete(A.streamId), this.uploadState.readerTimeouts.delete(A.streamId)), this.sendSubmitFileContents(A.streamId, true, new Uint8Array());
        const K = {
          message: `File read timeout after ${_Y.FILE_READER_TIMEOUT_MS / 1e3}s`,
          transferId: (_a = this.uploadState) == null ? void 0 : _a.transferIds.get(A.index),
          fileIndex: A.index,
          fileName: D.name,
          direction: "upload"
        };
        this.emit("error", K), this.uploadState !== void 0 && (this.uploadState.failedFiles.add(A.index), this.uploadState.completedFiles.add(A.index), this.uploadState.completedFiles.size >= this.uploadState.expectedFileCount && this.finishUploadBatch(this.uploadState));
      }, _Y.FILE_READER_TIMEOUT_MS);
      I.readerTimeouts.set(A.streamId, h), R.onload = () => {
        if (this.uploadState !== void 0) {
          this.uploadState.activeReaders.delete(A.streamId);
          const J = this.uploadState.readerTimeouts.get(A.streamId);
          J !== void 0 && (clearTimeout(J), this.uploadState.readerTimeouts.delete(A.streamId));
        }
        const K = new Uint8Array(R.result);
        if (this.sendSubmitFileContents(A.streamId, false, K), this.uploadState !== void 0) {
          const J = (this.uploadState.bytesServed.get(A.index) ?? 0) + K.length;
          this.uploadState.bytesServed.set(A.index, J);
          const $ = this.uploadState.transferIds.get(A.index) ?? -1, kA = {
            transferId: $,
            fileIndex: A.index,
            fileName: D.name,
            bytesTransferred: J,
            totalBytes: w.size,
            percentage: w.size === 0 ? 100 : Math.min(J / w.size * 100, 100)
          };
          this.emit("upload-progress", kA), J >= w.size && this.markUploadFileComplete(A.index, w, $);
        }
      }, R.onerror = () => {
        var _a, _b;
        if (this.uploadState !== void 0) {
          this.uploadState.activeReaders.delete(A.streamId);
          const J = this.uploadState.readerTimeouts.get(A.streamId);
          J !== void 0 && (clearTimeout(J), this.uploadState.readerTimeouts.delete(A.streamId));
        }
        if (((_a = this.uploadState) == null ? void 0 : _a.failedFiles.has(A.index)) === true)
          return;
        this.sendSubmitFileContents(A.streamId, true, new Uint8Array());
        const K = {
          message: "Failed to read file chunk",
          transferId: (_b = this.uploadState) == null ? void 0 : _b.transferIds.get(A.index),
          fileIndex: A.index,
          fileName: D.name,
          direction: "upload",
          cause: R.error
        };
        this.emit("error", K), this.uploadState !== void 0 && (this.uploadState.failedFiles.add(A.index), this.uploadState.completedFiles.add(A.index), this.uploadState.completedFiles.size >= this.uploadState.expectedFileCount && this.finishUploadBatch(this.uploadState));
      }, R.readAsArrayBuffer(i);
    }
  }
  /**
   * Mark a single upload file as fully served: record it, emit upload-complete once, and
   * finalize the batch once every counted file is accounted for. Shared by the RANGE onload
   * path (final chunk served) and the SIZE path for 0-byte files (which get no RANGE request).
   */
  markUploadFileComplete(A, I, g) {
    const Q = this.uploadState;
    Q === void 0 || Q.completedFiles.has(A) || (Q.completedFiles.add(A), this.emit("upload-complete", I, A, g), Q.completedFiles.size === Q.expectedFileCount && this.finishUploadBatch(Q));
  }
  /**
   * Lazily rebuild uploadState from retainedFiles when the remote re-pastes
   * after the original upload completed. This lets the main code path in
   * handleFileContentsRequest handle progress and completion identically.
   * No external promise - resolve/reject are no-ops.
   */
  rebuildUploadStateFromRetained() {
    const A = this.retainedFiles, I = /* @__PURE__ */ new Map();
    for (let Q = 0; Q < A.length; Q++)
      I.set(Q, this.generateStreamId());
    const g = A.filter((Q) => Q.isDirectory !== true).length;
    this.uploadState = {
      files: A.map((Q) => Q.file),
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
      const g = new DataView(A.data.buffer, A.data.byteOffset, A.data.byteLength), Q = Number(g.getBigUint64(0, true));
      if (Q > _Y.MAX_FILE_SIZE) {
        this.activeDownloads.delete(A.streamId), this.abortWriteHandle(I);
        const E = {
          message: `File size ${(Q / (1024 * 1024 * 1024)).toFixed(2)}GB exceeds maximum download limit of 2GB`,
          transferId: I.streamId,
          fileIndex: I.fileIndex,
          fileName: I.fileInfo.name,
          direction: "download"
        };
        this.emit("error", E), I.reject(new Error(E.message));
        return;
      }
      if (I.expectedSize = Q, Q === 0) {
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
        const I = (async () => (await this.ensureStorageBackend()).createWriteHandle(A.fileInfo.name, A.expectedSize ?? 0))(), g = _Y.WRITE_HANDLE_INIT_TIMEOUT_MS, Q = await Promise.race([
          I,
          new Promise(
            (E, D) => setTimeout(() => D(new Error(`Storage init timed out after ${g / 1e3}s`)), g)
          )
        ]);
        if (this.disposed || !this.activeDownloads.has(A.streamId)) {
          try {
            await Q.abort();
          } catch {
          }
          return;
        }
        A.writeHandle = Q;
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
      } catch (Q) {
        this.activeDownloads.delete(A.streamId), this.abortWriteHandle(A);
        const w = {
          message: Q instanceof DOMException && Q.name === "QuotaExceededError" ? `Storage quota exceeded while downloading "${A.fileInfo.name}"` : "Failed to write download chunk to storage",
          transferId: A.streamId,
          fileIndex: A.fileIndex,
          fileName: A.fileInfo.name,
          direction: "download",
          cause: Q
        };
        this.emit("error", w), A.reject(new Error(w.message, { cause: Q }));
        return;
      }
      if (A.bytesReceived += I.length, A.expectedSize !== void 0 && A.bytesReceived > A.expectedSize * 2) {
        this.activeDownloads.delete(A.streamId), this.abortWriteHandle(A);
        const Q = {
          message: `Received ${A.bytesReceived} bytes but expected ${A.expectedSize} - aborting`,
          transferId: A.streamId,
          fileIndex: A.fileIndex,
          fileName: A.fileInfo.name,
          direction: "download"
        };
        this.emit("error", Q), A.reject(new Error(Q.message));
        return;
      }
      if (A.expectedSize !== void 0) {
        const Q = {
          transferId: A.streamId,
          fileIndex: A.fileIndex,
          fileName: A.fileInfo.name,
          bytesTransferred: A.bytesReceived,
          totalBytes: A.expectedSize,
          percentage: Math.min(A.bytesReceived / A.expectedSize * 100, 100)
        };
        this.emit("download-progress", Q);
      }
      if (A.expectedSize !== void 0 && A.bytesReceived >= A.expectedSize) {
        this.activeDownloads.delete(A.streamId);
        try {
          const Q = await g.finalize();
          this.emit("download-complete", A.fileInfo, Q, A.fileIndex, A.streamId), A.resolve(Q);
        } catch (Q) {
          this.abortWriteHandle(A);
          const E = {
            message: "Failed to finalize downloaded file",
            transferId: A.streamId,
            fileIndex: A.fileIndex,
            fileName: A.fileInfo.name,
            direction: "download",
            cause: Q
          };
          this.emit("error", E), A.reject(new Error(E.message, { cause: Q }));
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
    for (const [g, Q] of this.activeDownloads)
      if (Q.clipDataId !== void 0 && I.has(Q.clipDataId)) {
        this.activeDownloads.delete(g), this.abortWriteHandle(Q);
        const E = `File download timed out for "${Q.fileInfo.name}". Clipboard lock expired due to inactivity. This can happen with slow network connections or large files. Try downloading smaller files, increasing chunk size, or checking your network connection.`;
        Q.reject(new Error(E)), this.emit("error", {
          message: E,
          transferId: Q.streamId,
          fileIndex: Q.fileIndex,
          fileName: Q.fileInfo.name,
          direction: "download"
        });
      }
  }
  // ==================== Helper Methods ====================
  requestNextChunk(A) {
    if (A.expectedSize === void 0 || A.expectedSize === 0)
      return;
    const I = A.bytesReceived, g = A.expectedSize - I, Q = Math.min(this.chunkSize, g);
    try {
      this.sendRequestFileContents(
        A.streamId,
        A.fileIndex,
        d.RANGE,
        I,
        Q,
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
async function oI(C) {
  await nA(), LA(C);
}
const yI = {
  DesktopSize: a,
  InputTransaction: z,
  SessionBuilder: M,
  ClipboardData: H,
  DeviceEvent: U
};
function MI(C) {
  return new F("pcb", C);
}
function RI(C, A = "enhanced") {
  if (C.trim() === "")
    throw new Error("vmconnect requires a VM ID");
  const I = A === "enhanced" ? `${C};EnhancedMode=1` : C;
  return new F("vmconnect", I);
}
function YI(C) {
  return new F("display_control", C);
}
function UI(C) {
  return new F("kdc_proxy_url", C);
}
function cI(C) {
  return new F("outbound_message_size_limit", C);
}
function KI(C) {
  return new F("enable_credssp", C);
}
function JI(C) {
  return new F("enable_server_pointer", C);
}
function hI(C) {
  return new F("legacy_graphics", C);
}
function SI(C) {
  return new F("egfx", C);
}
function sI(C) {
  return new F("avc420_webcodecs", C);
}
function LI(C) {
  return new F("rdpsnd_audio", C);
}
function HI(C) {
  hA(C);
}
function aI(C) {
  UA(C);
}
function qI(C, A, I, g, Q, E, D) {
  yA(C, A, I, g, Q, E, D);
}
function pI(C = 1) {
  oA(C >>> 0);
}
function ZI(C) {
  KA(C);
}
function jI(C) {
  cA(C);
}
function VI(C) {
  SA(C);
}
function dI(C) {
  sA(C);
}
function tI(C) {
  YA(C);
}
function WI(C) {
  JA(C);
}
function lI() {
  MA();
}
function XI() {
  return HA();
}
function xI() {
  return RA();
}
export {
  yI as Backend,
  FA as BlobStorageBackend,
  d as FileContentsFlags,
  V as OpfsStorageBackend,
  iI as PrinterDriverName,
  AA as RdpFile,
  Y as RdpFileTransferProvider,
  pI as acknowledgeEgfxPresented,
  qI as applyEgfxRgba,
  sI as avc420Webcodecs,
  lI as beginEgfxResizeCapture,
  wI as detectStorageBackend,
  YI as displayControl,
  SI as egfx,
  xI as egfxDiagErrorCount,
  KI as enableCredssp,
  JI as enableServerPointer,
  eA as fileContentsRequestCallback,
  vA as fileContentsResponseCallback,
  uA as filesAvailableCallback,
  oI as init,
  QI as initiateFileCopy,
  UI as kdcProxyUrl,
  hI as legacyGraphics,
  _A as lockCallback,
  AI as locksExpiredCallback,
  cI as outboundMessageSizeLimit,
  MI as preConnectionBlob,
  NI as printJobStreamCallbacks,
  FI as printerDeviceId,
  kI as printerDriverName,
  GI as printerName,
  tI as pushUdpPayload,
  LI as rdpsndAudio,
  gI as requestFileContents,
  aI as setAvc420WebcodecsCallback,
  jI as setEgfxAvcThinClient,
  ZI as setEgfxCapsCallback,
  WI as setEgfxResetCallback,
  HI as setRdpsndWaveCallback,
  VI as setUdpOpenCallback,
  dI as setUdpSendCallback,
  CI as submitFileContents,
  XI as takeEgfxResizeCapture,
  $A as unlockCallback,
  RI as vmConnect
};
