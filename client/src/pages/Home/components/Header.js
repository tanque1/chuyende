import { HiOutlineVideoCamera } from "react-icons/hi";
import { Link } from "react-router-dom";
import { GoogleLogin, useGoogleLogin, googleLogout } from "@react-oauth/google";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import userSlice from "../../../redux/userSlice";
export default function Header() {
  const dispatch = useDispatch();
  const { info } = useSelector((state) => state.user);
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      // fetching userinfo can be done on the client or the server
      const userInfo = await axios
        .get("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        })
        .then((res) => res.data);

      dispatch(userSlice.actions.userLogin(userInfo));
    },
  });

  const handleLogout = () => {
    googleLogout();
    dispatch(userSlice.actions.userLogout());
  };

  return (
    <header>
      <nav className="bg-white border-gray-200 px-4 lg:px-6 py-2.5 ">
        <div className="flex flex-wrap justify-between items-center  ">
          <Link to="/" className="flex items-center">
            <img
              src="/google-meet-icon.png"
              className="mr-3 h-6 sm:h-9"
              alt="Flowbite Logo"
            />
            <span className="self-center text-2xl font-semibold whitespace-nowrap text-gray-600">
              Google Meet
            </span>
          </Link>
          <div className="flex items-center lg:order-2">
            {info?
              <button
              onClick={handleLogout}
              className="text-gray-800 dark:text-white hover:bg-gray-50 focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-4 lg:px-5 py-2 lg:py-2.5 mr-2 dark:hover:bg-gray-700 focus:outline-none dark:focus:ring-gray-800"
            >
              Đăng xuất
            </button>: 
            <button
              onClick={googleLogin}
              className="text-gray-800 dark:text-white hover:bg-gray-50 focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-4 lg:px-5 py-2 lg:py-2.5 mr-2 dark:hover:bg-gray-700 focus:outline-none dark:focus:ring-gray-800"
            >
              Đăng nhập
            </button>
            }

            <button
              type="button"
              className="rounded text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium text-sm px-5 py-2.5 text-center mr-2 mb-2 "
            >
              Tham gia cuộc họp
            </button>
            <button
              type="button"
              className="rounded inline-flex items-center space-x-2 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium  text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
            >
              <HiOutlineVideoCamera size={24} />
              <span>Bắt đầu cuộc họp</span>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
