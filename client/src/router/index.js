import { Outlet, createBrowserRouter } from "react-router-dom";
import Home from "../pages/Home";
import Meeting from "../pages/Meeting";
import { useEffect } from "react";
import { io } from "socket.io-client";
import { useDispatch } from "react-redux";
import connectionSlice from "../redux/connectionSlice";
import { BASE_URI } from "../utils/constant";

const MainLayout = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    const socket = io(BASE_URI);
    dispatch(connectionSlice.actions.setInitSocket(socket));
    return () => {
      socket && socket.close();
    };
  }, []);
  return <Outlet />;
};

export default createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "meetingID/:id",
        element: <Meeting />,
      },
    ],
  },
]);
