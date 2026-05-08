import { Link } from "react-router-dom";

const NotAuthorized = () => {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center px-4">
      <div className="bg-white shadow-xl rounded-2xl p-10 text-center max-w-md w-full">
        <h1 className="text-6xl font-bold text-red-500 mb-4">403</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Access Denied
        </h2>
        <p className="text-gray-600 mb-6">
          You do not have permission to view this page.
          <br />
          Please contact your administrator if you believe this is a mistake.
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-all"
        >
          Go to Homepage
        </Link>
      </div>
    </div>
  );
};

export default NotAuthorized;
