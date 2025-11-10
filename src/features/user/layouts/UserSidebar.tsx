import { Home, Radio, Phone, Users, FileText, BarChart3, PhoneForwarded, History, CheckCircle, DollarSign, PhoneIncoming, Key } from "lucide-react";
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

const userGroups = [
  {
    label: "Principal",
    routes: [
      { title: "Dashboard", url: "/dashboard", icon: Home },
    ]
  },
  {
    label: "Comunicação",
    routes: [
      { title: "Central de Comunicação", url: "/dashboard", icon: Radio },
      { title: "Histórico SMS", url: "/historico-sms", icon: History },
      { title: "Chamadas URA", url: "/chamadas-ura", icon: PhoneForwarded },
      { title: "Chamadas Recebidas", url: "/chamadas-recebidas", icon: PhoneIncoming },
    ]
  },
  {
    label: "Monitoramento & Analytics",
    routes: [
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
      { title: "Relatório Custos", url: "/relatorio-custos", icon: DollarSign },
    ]
  },
  {
    label: "Gestão",
    routes: [
      { title: "Números", url: "/numbers", icon: Phone },
      { title: "Credenciais", url: "/credentials", icon: Key },
      { title: "Contatos", url: "/contacts", icon: Users },
      { title: "Templates", url: "/templates", icon: FileText },
      { title: "Validar Números", url: "/validar-numeros", icon: CheckCircle },
    ]
  },
];

export function UserSidebar() {
  const { open } = useSidebar();
  const location = useLocation();

  return (
    <Sidebar className="border-r border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950">
      <SidebarContent>
        {userGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-green-700 dark:text-green-300 px-4 py-3 text-sm font-semibold">
              {open ? group.label : group.label.split(' ')[0]}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.routes.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <NavLink
                          to={item.url}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-green-100 dark:hover:bg-green-900"
                          activeClassName="bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100 font-medium"
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
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
