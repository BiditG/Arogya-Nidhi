import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-4 min-h-[100vh] bg-gradient-to-br from-pink-100 via-blue-100 to-purple-100 rounded-lg">
      <h1 className="text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 animate-bounce mb-4">
        404
      </h1>
      <p className="text-2xl font-semibold text-gray-800 mb-2">
        Oops! Page not found.
      </p>
      <p className="text-gray-600 mb-6 max-w-md">
        It seems like you’re lost in the internet cosmos. Let's get you back to
        the homepage!
      </p>
      <Link
        to="/"
        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-transform duration-300"
      >
        🚀 Back to Home
      </Link>

      {/* My portfolio link */}
      <p className="mt-10 text-lg font-semibold text-gray-600">
        Or discover me at
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 inline-flex items-center text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:text-purple-800 relative group font-bold hover:translate-x-1 transition-all duration-300"
        >
          ArogyaNidhi
          <span className="block h-[2px] w-0 bg-purple-600 absolute bottom-0 left-0 group-hover:w-full transition-all duration-300"></span>
         
        </a>
      </p>
    </div>
  );
};

export default NotFound;
