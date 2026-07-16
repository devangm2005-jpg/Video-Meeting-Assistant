import { Link } from "react-router-dom";
import Reel from "../components/Reel.jsx";

export default function NotFound() {
  return (
    <div className="h-full min-h-[70vh] flex flex-col items-center justify-center text-center px-6">
      <Reel size={40} className="text-rec mb-4" />
      <h1 className="font-display text-5xl tracking-wide text-paper mb-2">TAPE'S EMPTY</h1>
      <p className="text-muted mb-6">There's nothing recorded at this address.</p>
      <Link to="/" className="btn-primary text-sm px-5 py-2.5">
        Back to start
      </Link>
    </div>
  );
}
