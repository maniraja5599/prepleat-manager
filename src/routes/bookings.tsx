import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/bookings")({ component: () => <Outlet /> });
