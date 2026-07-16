import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
setBaseUrl("/api");
setAuthTokenGetter(() => localStorage.getItem("riden_token"));
export {};
