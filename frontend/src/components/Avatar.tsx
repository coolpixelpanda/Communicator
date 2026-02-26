import { getAvatarColor, getInitials } from "../utils/avatar";

interface Props {
  username: string;
  size?: "xs" | "sm" | "md" | "lg";
  showStatus?: boolean;
  online?: boolean;
}

const sizeClasses = {
  xs: "h-4 w-4 text-[8px]",
  sm: "h-6 w-6 text-[10px]",
  md: "h-9 w-9 text-sm",
  lg: "h-12 w-12 text-base",
};

export default function Avatar({ username, size = "md", showStatus, online }: Props) {
  return (
    <div className="relative flex-shrink-0">
      <div
        className={`${sizeClasses[size]} ${getAvatarColor(username)} flex items-center justify-center rounded-lg font-bold text-white`}
      >
        {getInitials(username)}
      </div>
      {showStatus && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 block h-3 w-3 rounded-full border-2 border-[#1a1d21] ${
            online ? "bg-green-500" : "bg-gray-500"
          }`}
        />
      )}
    </div>
  );
}
