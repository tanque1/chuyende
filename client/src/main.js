import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./css/index.css";
import router from "./router";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import { ToastContainer } from "react-toastify";


import { GoogleOAuthProvider } from "@react-oauth/google";
ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
     <ToastContainer
      position="top-right"
      autoClose={500}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      draggable
      pauseOnHover
      theme="light"
    />

    <GoogleOAuthProvider clientId="61164813559-rne8lc01iumf0jefmt4rmrhtf9u2kgdu.apps.googleusercontent.com">
      <RouterProvider router={router}></RouterProvider>
    </GoogleOAuthProvider>
    
  </Provider>
);
