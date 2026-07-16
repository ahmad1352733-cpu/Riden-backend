import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

setBaseUrl("");
setAuthTokenGetter(() => localStorage.getItem("riden_token"));

export {};
