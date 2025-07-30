#include <napi.h>
#include <windows.h>
#include <string>

class RdpBasicWrapper {
private:
    HWND m_window;
    bool m_initialized;

public:
    RdpBasicWrapper() : m_window(nullptr), m_initialized(false) {}

    ~RdpBasicWrapper() {
        if (m_window) {
            DestroyWindow(m_window);
        }
    }

    bool Initialize(HWND parentWindow) {
        // Crear una ventana básica para demostrar
        m_window = CreateWindowEx(
            0,
            L"Static",
            L"RDP Control Placeholder",
            WS_CHILD | WS_VISIBLE | WS_BORDER,
            0, 0, 800, 600,
            parentWindow,
            nullptr,
            GetModuleHandle(nullptr),
            nullptr
        );

        if (!m_window) {
            return false;
        }

        m_initialized = true;
        return true;
    }

    bool Connect(const std::wstring& server, const std::wstring& username, const std::wstring& password) {
        if (!m_initialized) return false;

        // Simular conexión (por ahora solo muestra un mensaje)
        SetWindowText(m_window, L"Conectando...");
        
        // Aquí iría la lógica real de conexión RDP
        // Por ahora solo retornamos true para demostrar
        return true;
    }

    void Disconnect() {
        if (m_window) {
            SetWindowText(m_window, L"Desconectado");
        }
    }

    void Resize(int x, int y, int width, int height) {
        if (m_window) {
            SetWindowPos(m_window, nullptr, x, y, width, height, SWP_NOZORDER);
        }
    }

    bool IsConnected() {
        // Simular estado de conexión
        return m_initialized;
    }

    std::wstring GetStatus() {
        if (!m_window) return L"Not initialized";
        
        wchar_t text[256];
        GetWindowText(m_window, text, 256);
        return std::wstring(text);
    }
};

// Wrapper para N-API
class RdpBasicAddon : public Napi::ObjectWrap<RdpBasicAddon> {
private:
    RdpBasicWrapper* m_wrapper;

public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports) {
        Napi::Function func = DefineClass(env, "RdpBasicWrapper", {
            InstanceMethod("initialize", &RdpBasicAddon::Initialize),
            InstanceMethod("connect", &RdpBasicAddon::Connect),
            InstanceMethod("disconnect", &RdpBasicAddon::Disconnect),
            InstanceMethod("resize", &RdpBasicAddon::Resize),
            InstanceMethod("isConnected", &RdpBasicAddon::IsConnected),
            InstanceMethod("getStatus", &RdpBasicAddon::GetStatus),
        });

        exports.Set("RdpBasicWrapper", func);
        return exports;
    }

    RdpBasicAddon(const Napi::CallbackInfo& info) : Napi::ObjectWrap<RdpBasicAddon>(info), m_wrapper(nullptr) {
        m_wrapper = new RdpBasicWrapper();
    }

    ~RdpBasicAddon() {
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

    Napi::Value GetStatus(const Napi::CallbackInfo& info) {
        std::wstring status = m_wrapper->GetStatus();
        return Napi::String::New(info.Env(), status);
    }
};

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    return RdpBasicAddon::Init(env, exports);
}

NODE_API_MODULE(rdp_activex_basic, Init) 