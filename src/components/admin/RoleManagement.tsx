import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Shield, 
  RefreshCw,
  UserCog,
  Key,
  Plus,
  Trash2,
  Info
} from "lucide-react";

interface UserWithRole {
  user_id: string;
  email: string;
  full_name: string | null;
  roles: string[];
}

interface RolePermission {
  role: string;
  label: string;
  description: string;
  permissions: string[];
  color: string;
}

const ROLE_DEFINITIONS: RolePermission[] = [
  {
    role: "admin",
    label: "Administrador",
    description: "Acceso completo al sistema. Puede gestionar usuarios, roles y toda la configuración.",
    permissions: [
      "Gestionar usuarios",
      "Asignar roles",
      "Ver todos los consentimientos",
      "Eliminar consentimientos",
      "Configurar sistema",
      "Ver reportes",
      "Exportar datos",
      "Gestionar webhooks",
      "Configurar API"
    ],
    color: "bg-red-100 text-red-800 border-red-200"
  },
  {
    role: "doctor",
    label: "Médico",
    description: "Puede crear y gestionar consentimientos de pacientes.",
    permissions: [
      "Crear consentimientos",
      "Ver sus consentimientos",
      "Editar sus consentimientos",
      "Enviar consentimientos",
      "Ver reportes propios"
    ],
    color: "bg-blue-100 text-blue-800 border-blue-200"
  },
  {
    role: "lab_technician",
    label: "Técnico de Laboratorio",
    description: "Puede crear y gestionar consentimientos relacionados con procedimientos de laboratorio.",
    permissions: [
      "Crear consentimientos de laboratorio",
      "Ver consentimientos de laboratorio",
      "Tomar muestras",
      "Ver historial de pacientes"
    ],
    color: "bg-green-100 text-green-800 border-green-200"
  },
  {
    role: "receptionist",
    label: "Recepcionista",
    description: "Puede registrar pacientes y ver información básica.",
    permissions: [
      "Registrar pacientes",
      "Ver información de pacientes",
      "Enviar consentimientos",
      "Ver estado de consentimientos"
    ],
    color: "bg-purple-100 text-purple-800 border-purple-200"
  },
  {
    role: "viewer",
    label: "Visualizador",
    description: "Solo puede ver información, sin capacidad de modificar.",
    permissions: [
      "Ver consentimientos",
      "Ver reportes"
    ],
    color: "bg-gray-100 text-gray-800 border-gray-200"
  }
];

export function RoleManagement() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_users_with_roles');
      
      if (error) throw error;
      
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast.error("Error al cargar usuarios: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const openRoleDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setSelectedRoles(user.roles || []);
    setIsRoleDialogOpen(true);
  };

  const handleRoleToggle = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const handleSaveRoles = async () => {
    if (!selectedUser) return;

    try {
      // First, delete all existing roles for this user
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser.user_id);

      if (deleteError) throw deleteError;

      // Then insert the new roles
      if (selectedRoles.length > 0) {
        const rolesToInsert = selectedRoles.map(role => ({
          user_id: selectedUser.user_id,
          role: role as any
        }));

        const { error: insertError } = await supabase
          .from('user_roles')
          .insert(rolesToInsert);

        if (insertError) throw insertError;
      }

      toast.success("Roles actualizados exitosamente");
      setIsRoleDialogOpen(false);
      loadUsers();
    } catch (error: any) {
      console.error('Error updating roles:', error);
      toast.error("Error al actualizar roles: " + error.message);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    const roleDef = ROLE_DEFINITIONS.find(r => r.role === role);
    return roleDef?.color || "bg-gray-100 text-gray-800";
  };

  const getRoleLabel = (role: string) => {
    const roleDef = ROLE_DEFINITIONS.find(r => r.role === role);
    return roleDef?.label || role;
  };

  return (
    <div className="space-y-6">
      {/* Role Definitions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Definición de Roles y Permisos
          </CardTitle>
          <CardDescription>
            Cada rol tiene permisos específicos en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROLE_DEFINITIONS.map((roleDef) => (
              <Card key={roleDef.role} className="border-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge className={roleDef.color}>{roleDef.label}</Badge>
                    <Shield className="h-4 w-4 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">{roleDef.description}</p>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500">Permisos:</p>
                    <ul className="text-xs space-y-1">
                      {roleDef.permissions.map((perm, idx) => (
                        <li key={idx} className="flex items-center gap-1">
                          <span className="w-1 h-1 bg-medical-blue rounded-full"></span>
                          {perm}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Role Assignment */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Asignación de Roles a Usuarios
              </CardTitle>
              <CardDescription>
                Asigne uno o más roles a cada usuario del sistema
              </CardDescription>
            </div>
            <Button variant="outline" onClick={loadUsers} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Roles Asignados</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">
                      {user.full_name || 'Sin nombre'}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map((role, idx) => (
                            <Badge key={idx} className={getRoleBadgeClass(role)}>
                              {getRoleLabel(role)}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-gray-400">
                            Sin rol asignado
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRoleDialog(user)}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        Gestionar Roles
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Role Assignment Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Gestionar Roles
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium">{selectedUser.full_name || 'Sin nombre'}</p>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Seleccione los roles:</Label>
                {ROLE_DEFINITIONS.map((roleDef) => (
                  <div
                    key={roleDef.role}
                    className={`flex items-start space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedRoles.includes(roleDef.role) 
                        ? 'border-medical-blue bg-medical-blue/5' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleRoleToggle(roleDef.role)}
                  >
                    <Checkbox
                      checked={selectedRoles.includes(roleDef.role)}
                      onCheckedChange={() => handleRoleToggle(roleDef.role)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge className={roleDef.color}>{roleDef.label}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{roleDef.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {selectedRoles.length === 0 && (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                  <Info className="h-4 w-4" />
                  <span className="text-sm">El usuario no tendrá acceso si no tiene roles asignados.</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRoles} className="bg-medical-blue hover:bg-medical-blue/90">
              Guardar Roles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
