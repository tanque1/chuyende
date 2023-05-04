import { HiOutlineVideoCamera } from "react-icons/hi";
import { Link } from "react-router-dom";

export default function Header() {
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
            <Link
              to="/login"
              className="text-gray-800 dark:text-white hover:bg-gray-50 focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-4 lg:px-5 py-2 lg:py-2.5 mr-2 dark:hover:bg-gray-700 focus:outline-none dark:focus:ring-gray-800"
            >
              Đăng nhập
            </Link>
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
