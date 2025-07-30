#include <napi.h>
#include <windows.h>
#include <ole2.h>
#include <mstsc.h>
#include <mstsax.h>
#include <string>

class RdpActiveXWrapper {
private:
    IMsRdpClient7* m_rdpClient;
    HWND m_rdpWindow;
    bool m_initialized;

public:
    RdpActiveXWrapper() : m_rdpClient(nullptr), m_rdpWindow(nullptr), m_initialized(false) {}

    ~RdpActiveXWrapper() {
        if (m_rdpClient) {
            m_rdpClient->Release();
        }
        if (m_rdpWindow) {
            DestroyWindow(m_rdpWindow);
        }
        if (m_initialized) {
            CoUninitialize();
        }
    }

    bool Initialize(HWND parentWindow) {
        // Inicializar COM
        HRESULT hr = CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);
        if (FAILED(hr)) {
            return false;
        }
        m_initialized = true;

        // Crear instancia del control RDP
        hr = CoCreateInstance(
            CLSID_MsRdpClient7,
            nullptr,
            CLSCTX_INPROC_SERVER,
            IID_IMsRdpClient7,
            (void**)&m_rdpClient
        );

        if (FAILED(hr) || !m_rdpClient) {
            return false;
        }

        // Crear ventana para el control
        m_rdpWindow = CreateWindowEx(
            0,
            L"Static",
            L"RDP Control",
            WS_CHILD | WS_VISIBLE,
            0, 0, 800, 600,
            parentWindow,
            nullptr,
            GetModuleHandle(nullptr),
            nullptr
        );

        if (!m_rdpWindow) {
            return false;
        }

        // Configurar el control RDP
        m_rdpClient->put_Server(L"");
        m_rdpClient->put_UserName(L"");
        m_rdpClient->put_AdvancedSettings7->put_DisplayConnectionBar(VARIANT_TRUE);
        m_rdpClient->put_AdvancedSettings7->put_PinConnectionBar(VARIANT_TRUE);

        return true;
    }

    bool Connect(const std::wstring& server, const std::wstring& username, const std::wstring& password) {
        if (!m_rdpClient) return false;

        try {
            m_rdpClient->put_Server((BSTR)server.c_str());
            m_rdpClient->put_UserName((BSTR)username.c_str());
            
            // Configurar credenciales
            IMsRdpClientAdvancedSettings7* advancedSettings;
            HRESULT hr = m_rdpClient->get_AdvancedSettings7(&advancedSettings);
            if (SUCCEEDED(hr)) {
                advancedSettings->put_ClearTextPassword((BSTR)password.c_str());
                advancedSettings->Release();
            }

            // Conectar
            hr = m_rdpClient->Connect();
            return SUCCEEDED(hr);
        }
        catch (...) {
            return false;
        }
    }

    void Disconnect() {
        if (m_rdpClient) {
            m_rdpClient->Disconnect();
        }
    }

    void Resize(int x, int y, int width, int height) {
        if (m_rdpWindow) {
            SetWindowPos(m_rdpWindow, nullptr, x, y, width, height, SWP_NOZORDER);
        }
    }

    bool IsConnected() {
        if (!m_rdpClient) return false;
        
        long state = 0;
        HRESULT hr = m_rdpClient->get_Connected(&state);
        return SUCCEEDED(hr) && state != 0;
    }
};

// Wrapper para N-API
class RdpActiveXAddon : public Napi::ObjectWrap<RdpActiveXAddon> {
private:
    RdpActiveXWrapper* m_wrapper;

public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports) {
        Napi::Function func = DefineClass(env, "RdpActiveXWrapper", {
            InstanceMethod("initialize", &RdpActiveXAddon::Initialize),
            InstanceMethod("connect", &RdpActiveXAddon::Connect),
            InstanceMethod("disconnect", &RdpActiveXAddon::Disconnect),
            InstanceMethod("resize", &RdpActiveXAddon::Resize),
            InstanceMethod("isConnected", &RdpActiveXAddon::IsConnected),
        });

        exports.Set("RdpActiveXWrapper", func);
        return exports;
    }

    RdpActiveXAddon(const Napi::CallbackInfo& info) : Napi::ObjectWrap<RdpActiveXAddon>(info), m_wrapper(nullptr) {
        m_wrapper = new RdpActiveXWrapper();
    }

    ~RdpActiveXAddon() {
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

        uint64_t parentHandle = info[0].As<Napi::BigInt>().Uint64Value(&napi::BigInt::Lossless);
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

        std::wstring server = info[0].As<Napi::String>().Utf16Value();
        std::wstring username = info[1].As<Napi::String>().Utf16Value();
        std::wstring password = info[2].As<Napi::String>().Utf16Value();

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
};

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    return RdpActiveXAddon::Init(env, exports);
}

NODE_API_MODULE(rdp_activex_simple, Init) 