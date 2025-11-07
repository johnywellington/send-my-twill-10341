import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Network, 
  Activity, 
  BarChart3, 
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const adminRoutes = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Usuários", url: "/admin/users", icon: Users },
  { title: "Módulo SIP", url: "/admin/sip", icon: Settings },
];

export function AdminSidebar() {
  const { open } = useSidebar();
  const location = useLocation();

  return (
    <Sidebar className="border-r border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-red-700 dark:text-red-300 px-4 py-3 text-sm font-semibold">
            {open ? "Painel Administrativo" : "Admin"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminRoutes.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-red-100 dark:hover:bg-red-900"
                        activeClassName="bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100 font-medium"
                      >
                        <item.icon className="h-5 w-5" />
                        {open && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
