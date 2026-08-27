export {};

interface FacebookLoginResponse {
  status?: "connected" | "not_authorized" | "unknown";
  authResponse?: {
    code?: string;
    accessToken?: string;
    userID?: string;
  };
}

interface FacebookLoginOptions {
  config_id?: string;
  response_type?: "code" | "token";
  override_default_response_type?: boolean;
  scope?: string;
  extras?: Record<string, unknown>;
}

interface FacebookSDK {
  init: (params: {
    appId: string;
    autoLogAppEvents?: boolean;
    xfbml?: boolean;
    version: string;
  }) => void;
  login: (
    callback: (response: FacebookLoginResponse) => void,
    options?: FacebookLoginOptions
  ) => void;
}

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: FacebookSDK;
  }
}
