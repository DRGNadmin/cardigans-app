import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoutes } from "react-router-dom";
import { getMe, getToken } from "../api";
import { getPerfReduced } from "../lib/perfMode";
import { AdminScreen } from "../screens/AdminScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { MatchScreen } from "../screens/MatchScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { ShopScreen } from "../screens/ShopScreen";
import { TasksScreen } from "../screens/TasksScreen";

export function AnimatedRoutes() {
  const location = useLocation();
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: !!getToken(),
  });
  const isAdmin = me?.isAdmin ?? false;

  const element = useRoutes(
    [
      { path: "/", element: <HomeScreen /> },
      { path: "/tasks", element: <TasksScreen /> },
      { path: "/shop", element: <ShopScreen /> },
      { path: "/profile", element: <ProfileScreen /> },
      { path: "/admin", element: <AdminScreen /> },
      { path: "/matches/:id", element: <MatchScreen isAdmin={isAdmin} /> },
      { path: "/match-room/:id", element: <MatchScreen isAdmin={isAdmin} /> },
    ],
    location
  );

  const light = getPerfReduced();

  return (
    <motion.div
      key={location.pathname}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
      initial={light ? { opacity: 0 } : { opacity: 0, y: 18, filter: "blur(8px)" }}
      animate={light ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={
        light
          ? { duration: 0.12, ease: "easeOut" }
          : { duration: 0.34, ease: [0.22, 1, 0.36, 1] }
      }
    >
      {element}
    </motion.div>
  );
}
