#include <napi.h>
#include <windows.h>
#include <string>
#include <comdef.h>
#include <atlbase.h>
#include <atlcom.h>

// Terminal Services ActiveX Client CLSID
// Note: These CLSIDs need to be defined based on the actual RDP client version available
static const CLSID CLSID_MsRdpClient = { 0x791fa017, 0x2de3, 0x492e, { 0xac, 0xc5, 0x53, 0xc6, 0x8f, 0xdc, 0x04, 0x96 } };

// Import libraries for COM and RDP
#pragma comment(lib, "ole32.lib")
#pragma comment(lib, "oleaut32.lib")
#pragma comment(lib, "uuid.lib")

class RdpAdvancedWrapper {
private:
    HWND m_window;
    HWND m_parentWindow;
    HWND m_rdpWindow;
    bool m_initialized;
    bool m_connected;
    
    // COM interfaces
    CComPtr<IUnknown> m_rdpControl;
    CComPtr<IDispatch> m_rdpDispatch;
    
    // Connection settings
    std::string m_server;
    std::string m_username;
    std::string m_password;
    int m_width;
    int m_height;
    
    // Window procedure for our container window
    static LRESULT CALLBACK WindowProc(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
        RdpAdvancedWrapper* pThis = nullptr;
        
        if (uMsg == WM_NCCREATE) {
            CREATESTRUCT* pCreate = (CREATESTRUCT*)lParam;
            pThis = (RdpAdvancedWrapper*)pCreate->lpCreateParams;
            SetWindowLongPtr(hwnd, GWLP_USERDATA, (LONG_PTR)pThis);
        } else {
            pThis = (RdpAdvancedWrapper*)GetWindowLongPtr(hwnd, GWLP_USERDATA);
        }
        
        if (pThis) {
            return pThis->HandleMessage(hwnd, uMsg, wParam, lParam);
        }
        
        return DefWindowProc(hwnd, uMsg, wParam, lParam);
    }
    
    LRESULT HandleMessage(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
        switch (uMsg) {
            case WM_SIZE:
                if (m_rdpWindow) {
                    RECT rect;
                    GetClientRect(hwnd, &rect);
                    SetWindowPos(m_rdpWindow, nullptr, 0, 0, 
                               rect.right - rect.left, rect.bottom - rect.top, 
                               SWP_NOZORDER | SWP_NOACTIVATE);
                }
                break;
                
            case WM_DESTROY:
                Disconnect();
                break;
        }
        
        return DefWindowProc(hwnd, uMsg, wParam, lParam);
    }

public:
    RdpAdvancedWrapper() : 
        m_window(nullptr), 
        m_parentWindow(nullptr),
        m_rdpWindow(nullptr),
        m_initialized(false), 
        m_connected(false),
        m_width(1024),
        m_height(768) {
        
        // Initialize COM
        CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);
    }

    ~RdpAdvancedWrapper() {
        Disconnect();
        
        if (m_rdpControl) {
            m_rdpControl.Release();
        }
        
        if (m_rdpDispatch) {
            m_rdpDispatch.Release();
        }
        
        if (m_window) {
            DestroyWindow(m_window);
        }
        
        CoUninitialize();
    }

    bool Initialize(HWND parentWindow) {
        m_parentWindow = parentWindow;
        
        // Register window class for our container
        static bool classRegistered = false;
        if (!classRegistered) {
            WNDCLASSEX wcex = {};
            wcex.cbSize = sizeof(WNDCLASSEX);
            wcex.lpfnWndProc = WindowProc;
            wcex.hInstance = GetModuleHandle(nullptr);
            wcex.lpszClassName = L"RdpContainerWindow";
            wcex.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);
            wcex.hCursor = LoadCursor(nullptr, IDC_ARROW);
            
            if (!RegisterClassEx(&wcex)) {
                return false;
            }
            classRegistered = true;
        }
        
        // Create container window for RDP control
        m_window = CreateWindowExW(
            0,
            L"RdpContainerWindow",
            L"RDP Container",
            WS_CHILD | WS_VISIBLE | WS_CLIPCHILDREN,
            0, 0, 800, 600,
            parentWindow,
            nullptr,
            GetModuleHandle(nullptr),
            this
        );

        if (!m_window) {
            return false;
        }

        // Try to create RDP ActiveX Control using different approaches
        HRESULT hr = CreateRdpControl();
        if (FAILED(hr)) {
            return false;
        }

        m_initialized = true;
        return true;
    }
    
    HRESULT CreateRdpControl() {
        // Try different methods to create RDP control
        
        // Method 1: Try to create the latest RDP client
        HRESULT hr = CoCreateInstance(
            CLSID_MsRdpClient,
            nullptr,
            CLSCTX_INPROC_SERVER,
            IID_IUnknown,
            (void**)&m_rdpControl
        );
        
        if (FAILED(hr)) {
            // Method 2: Try using ProgID
            CLSID clsid;
            hr = CLSIDFromProgID(L"MsRdpClient.MsRdpClient.1", &clsid);
            if (SUCCEEDED(hr)) {
                hr = CoCreateInstance(
                    clsid,
                    nullptr,
                    CLSCTX_INPROC_SERVER,
                    IID_IUnknown,
                    (void**)&m_rdpControl
                );
            }
        }
        
        if (FAILED(hr)) {
            // Method 3: Try alternative ProgID
            CLSID clsid;
            hr = CLSIDFromProgID(L"MsTscAx.MsTscAx.1", &clsid);
            if (SUCCEEDED(hr)) {
                hr = CoCreateInstance(
                    clsid,
                    nullptr,
                    CLSCTX_INPROC_SERVER,
                    IID_IUnknown,
                    (void**)&m_rdpControl
                );
            }
        }
        
        if (FAILED(hr) || !m_rdpControl) {
            return hr;
        }
        
        // Get IDispatch interface for method calls
        hr = m_rdpControl->QueryInterface(IID_IDispatch, (void**)&m_rdpDispatch);
        if (FAILED(hr)) {
            return hr;
        }
        
        // Try to embed the control in our window
        return EmbedControl();
    }
    
    HRESULT EmbedControl() {
        if (!m_rdpControl) return E_FAIL;
        
        // Get IOleObject interface
        CComPtr<IOleObject> oleObject;
        HRESULT hr = m_rdpControl->QueryInterface(IID_IOleObject, (void**)&oleObject);
        if (FAILED(hr)) return hr;
        
        // Create a simple client site
        CComPtr<IOleClientSite> clientSite;
        hr = CreateClientSite(&clientSite);
        if (FAILED(hr)) return hr;
        
        // Set the client site
        hr = oleObject->SetClientSite(clientSite);
        if (FAILED(hr)) return hr;
        
        // Set host names
        hr = oleObject->SetHostNames(L"NodeTermRDP", L"RDPDocument");
        if (FAILED(hr)) return hr;
        
        // Get window handle
        CComPtr<IOleInPlaceObject> inPlaceObject;
        hr = m_rdpControl->QueryInterface(IID_IOleInPlaceObject, (void**)&inPlaceObject);
        if (SUCCEEDED(hr)) {
            RECT rect;
            GetClientRect(m_window, &rect);
            
            hr = inPlaceObject->SetObjectRects(&rect, &rect);
            if (SUCCEEDED(hr)) {
                hr = inPlaceObject->GetWindow(&m_rdpWindow);
                if (SUCCEEDED(hr) && m_rdpWindow) {
                    SetParent(m_rdpWindow, m_window);
                    ShowWindow(m_rdpWindow, SW_SHOW);
                }
            }
        }
        
        return S_OK;
    }
    
    HRESULT CreateClientSite(IOleClientSite** ppClientSite) {
        // For simplicity, we'll create a minimal client site
        // In a full implementation, you'd create a proper client site class
        *ppClientSite = nullptr;
        return S_OK; // Simplified - the control might work without explicit client site
    }

    bool Connect(const std::string& server, const std::string& username, const std::string& password) {
        if (!m_initialized || !m_rdpDispatch) return false;
        
        m_server = server;
        m_username = username;
        m_password = password;

        try {
            // Use IDispatch to call methods
            DISPID dispid;
            LPOLESTR methodName;
            HRESULT hr;
            
            // Set server
            methodName = L"Server";
            hr = m_rdpDispatch->GetIDsOfNames(IID_NULL, &methodName, 1, LOCALE_USER_DEFAULT, &dispid);
            if (SUCCEEDED(hr)) {
                VARIANT var;
                VariantInit(&var);
                var.vt = VT_BSTR;
                
                // Convert server string to BSTR
                int len = MultiByteToWideChar(CP_UTF8, 0, server.c_str(), -1, nullptr, 0);
                wchar_t* wstr = new wchar_t[len];
                MultiByteToWideChar(CP_UTF8, 0, server.c_str(), -1, wstr, len);
                var.bstrVal = SysAllocString(wstr);
                delete[] wstr;
                
                DISPPARAMS params = { &var, nullptr, 1, 0 };
                hr = m_rdpDispatch->Invoke(dispid, IID_NULL, LOCALE_USER_DEFAULT, DISPATCH_PROPERTYPUT, &params, nullptr, nullptr, nullptr);
                
                VariantClear(&var);
            }
            
            // Set username
            methodName = L"UserName";
            hr = m_rdpDispatch->GetIDsOfNames(IID_NULL, &methodName, 1, LOCALE_USER_DEFAULT, &dispid);
            if (SUCCEEDED(hr)) {
                VARIANT var;
                VariantInit(&var);
                var.vt = VT_BSTR;
                
                int len = MultiByteToWideChar(CP_UTF8, 0, username.c_str(), -1, nullptr, 0);
                wchar_t* wstr = new wchar_t[len];
                MultiByteToWideChar(CP_UTF8, 0, username.c_str(), -1, wstr, len);
                var.bstrVal = SysAllocString(wstr);
                delete[] wstr;
                
                DISPPARAMS params = { &var, nullptr, 1, 0 };
                hr = m_rdpDispatch->Invoke(dispid, IID_NULL, LOCALE_USER_DEFAULT, DISPATCH_PROPERTYPUT, &params, nullptr, nullptr, nullptr);
                
                VariantClear(&var);
            }
            
            // Set display settings
            SetDisplaySettings(m_width, m_height);
            
            // Connect
            methodName = L"Connect";
            hr = m_rdpDispatch->GetIDsOfNames(IID_NULL, &methodName, 1, LOCALE_USER_DEFAULT, &dispid);
            if (SUCCEEDED(hr)) {
                DISPPARAMS params = { nullptr, nullptr, 0, 0 };
                hr = m_rdpDispatch->Invoke(dispid, IID_NULL, LOCALE_USER_DEFAULT, DISPATCH_METHOD, &params, nullptr, nullptr, nullptr);
                
                if (SUCCEEDED(hr)) {
                    m_connected = true;
                    return true;
                }
            }
        }
        catch (const _com_error& e) {
            return false;
        }
        
        return false;
    }

    void Disconnect() {
        if (m_rdpDispatch && m_connected) {
            try {
                DISPID dispid;
                LPOLESTR methodName = L"Disconnect";
                HRESULT hr = m_rdpDispatch->GetIDsOfNames(IID_NULL, &methodName, 1, LOCALE_USER_DEFAULT, &dispid);
                if (SUCCEEDED(hr)) {
                    DISPPARAMS params = { nullptr, nullptr, 0, 0 };
                    m_rdpDispatch->Invoke(dispid, IID_NULL, LOCALE_USER_DEFAULT, DISPATCH_METHOD, &params, nullptr, nullptr, nullptr);
                }
                m_connected = false;
            }
            catch (const _com_error& e) {
                // Handle disconnect errors
            }
        }
    }

    void Resize(int x, int y, int width, int height) {
        if (m_window) {
            SetWindowPos(m_window, nullptr, x, y, width, height, SWP_NOZORDER);
            
            // The window procedure will handle resizing the RDP control
            m_width = width;
            m_height = height;
        }
    }

    bool IsConnected() {
        if (!m_rdpDispatch) return false;
        
        try {
            DISPID dispid;
            LPOLESTR propName = L"Connected";
            HRESULT hr = m_rdpDispatch->GetIDsOfNames(IID_NULL, &propName, 1, LOCALE_USER_DEFAULT, &dispid);
            if (SUCCEEDED(hr)) {
                VARIANT result;
                VariantInit(&result);
                DISPPARAMS params = { nullptr, nullptr, 0, 0 };
                hr = m_rdpDispatch->Invoke(dispid, IID_NULL, LOCALE_USER_DEFAULT, DISPATCH_PROPERTYGET, &params, &result, nullptr, nullptr);
                
                if (SUCCEEDED(hr) && result.vt == VT_I2) {
                    bool connected = (result.iVal != 0);
                    VariantClear(&result);
                    return connected;
                }
                VariantClear(&result);
            }
        }
        catch (const _com_error& e) {
            return false;
        }
        
        return false;
    }

    std::string GetStatus() {
        if (!m_initialized) return "Not initialized";
        if (!m_rdpDispatch) return "RDP Control not created";
        
        if (IsConnected()) {
            return "Connected to " + m_server;
        } else {
            return "Disconnected";
        }
    }
    
    void SetDisplaySettings(int width, int height) {
        m_width = width;
        m_height = height;
        
        if (m_rdpDispatch) {
            try {
                // Set DesktopWidth
                DISPID dispid;
                LPOLESTR propName = L"DesktopWidth";
                HRESULT hr = m_rdpDispatch->GetIDsOfNames(IID_NULL, &propName, 1, LOCALE_USER_DEFAULT, &dispid);
                if (SUCCEEDED(hr)) {
                    VARIANT var;
                    VariantInit(&var);
                    var.vt = VT_I4;
                    var.lVal = width;
                    
                    DISPPARAMS params = { &var, nullptr, 1, 0 };
                    m_rdpDispatch->Invoke(dispid, IID_NULL, LOCALE_USER_DEFAULT, DISPATCH_PROPERTYPUT, &params, nullptr, nullptr, nullptr);
                    VariantClear(&var);
                }
                
                // Set DesktopHeight
                propName = L"DesktopHeight";
                hr = m_rdpDispatch->GetIDsOfNames(IID_NULL, &propName, 1, LOCALE_USER_DEFAULT, &dispid);
                if (SUCCEEDED(hr)) {
                    VARIANT var;
                    VariantInit(&var);
                    var.vt = VT_I4;
                    var.lVal = height;
                    
                    DISPPARAMS params = { &var, nullptr, 1, 0 };
                    m_rdpDispatch->Invoke(dispid, IID_NULL, LOCALE_USER_DEFAULT, DISPATCH_PROPERTYPUT, &params, nullptr, nullptr, nullptr);
                    VariantClear(&var);
                }
            }
            catch (const _com_error& e) {
                // Handle display settings error
            }
        }
    }
};

// Wrapper para N-API
class RdpAdvancedAddon : public Napi::ObjectWrap<RdpAdvancedAddon> {
private:
    RdpAdvancedWrapper* m_wrapper;

public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports) {
        Napi::Function func = DefineClass(env, "RdpAdvancedWrapper", {
            InstanceMethod("initialize", &RdpAdvancedAddon::Initialize),
            InstanceMethod("connect", &RdpAdvancedAddon::Connect),
            InstanceMethod("disconnect", &RdpAdvancedAddon::Disconnect),
            InstanceMethod("resize", &RdpAdvancedAddon::Resize),
            InstanceMethod("isConnected", &RdpAdvancedAddon::IsConnected),
            InstanceMethod("getStatus", &RdpAdvancedAddon::GetStatus),
            InstanceMethod("setDisplaySettings", &RdpAdvancedAddon::SetDisplaySettings),
        });

        exports.Set("RdpAdvancedWrapper", func);
        return exports;
    }

    RdpAdvancedAddon(const Napi::CallbackInfo& info) : Napi::ObjectWrap<RdpAdvancedAddon>(info), m_wrapper(nullptr) {
        m_wrapper = new RdpAdvancedWrapper();
    }

    ~RdpAdvancedAddon() {
        if (m_wrapper) {
            delete m_wrapper;
        }
    }

    Napi::Value Initialize(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 1) {
            Napi::TypeError::New(env, "Se requiere el handle de la ventana padre").ThrowAsJavaScriptException();
            return env.Null();
        }

        // Convertir BigInt a uint64_t de forma segura
        Napi::BigInt bigInt = info[0].As<Napi::BigInt>();
        bool lossless;
        uint64_t parentHandle = bigInt.Uint64Value(&lossless);
        HWND parentWindow = (HWND)(uintptr_t)parentHandle;

        bool success = m_wrapper->Initialize(parentWindow);
        return Napi::Boolean::New(env, success);
    }

    Napi::Value Connect(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 3) {
            Napi::TypeError::New(env, "Se requieren server, username y password").ThrowAsJavaScriptException();
            return env.Null();
        }

        std::string server = info[0].As<Napi::String>().Utf8Value();
        std::string username = info[1].As<Napi::String>().Utf8Value();
        std::string password = info[2].As<Napi::String>().Utf8Value();

        bool success = m_wrapper->Connect(server, username, password);
        return Napi::Boolean::New(env, success);
    }

    Napi::Value Disconnect(const Napi::CallbackInfo& info) {
        m_wrapper->Disconnect();
        return info.Env().Undefined();
    }

    Napi::Value Resize(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 4) {
            Napi::TypeError::New(env, "Se requieren x, y, width, height").ThrowAsJavaScriptException();
            return env.Null();
        }

        int x = info[0].As<Napi::Number>().Int32Value();
        int y = info[1].As<Napi::Number>().Int32Value();
        int width = info[2].As<Napi::Number>().Int32Value();
        int height = info[3].As<Napi::Number>().Int32Value();

        m_wrapper->Resize(x, y, width, height);
        return env.Undefined();
    }

    Napi::Value IsConnected(const Napi::CallbackInfo& info) {
        bool connected = m_wrapper->IsConnected();
        return Napi::Boolean::New(info.Env(), connected);
    }

    Napi::Value GetStatus(const Napi::CallbackInfo& info) {
        std::string status = m_wrapper->GetStatus();
        return Napi::String::New(info.Env(), status);
    }
    
    Napi::Value SetDisplaySettings(const Napi::CallbackInfo& info) {
        Napi::Env env = info.Env();
        
        if (info.Length() < 2) {
            Napi::TypeError::New(env, "Se requieren width y height").ThrowAsJavaScriptException();
            return env.Null();
        }

        int width = info[0].As<Napi::Number>().Int32Value();
        int height = info[1].As<Napi::Number>().Int32Value();

        m_wrapper->SetDisplaySettings(width, height);
        return env.Undefined();
    }
};

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    return RdpAdvancedAddon::Init(env, exports);
}

NODE_API_MODULE(rdp_activex_advanced, Init)
