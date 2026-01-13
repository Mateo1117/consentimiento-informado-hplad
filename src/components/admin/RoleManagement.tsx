import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Shield, 
  RefreshCw,
  UserCog,
  Key,
  Plus,
  Trash2,
  Info,
  Edit,
  Save,
  X,
  Lock
} from "lucide-react";

type AppRole = 'admin' | 'doctor' | 'lab_technician' | 'receptionist' | 'viewer';

interface UserWithRole {
  user_id: string;
  email: string;
  full_name: string | null;
  roles: AppRole[];
}

interface RolePermission {
  permission_key: string;
  permission_label: string;
  is_enabled: boolean;
}

interface DynamicRole {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
}

interface RoleDefinition {
  role: AppRole;
  label: string;
  description: string;
  color: string;
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-800 border-red-200",
  doctor: "bg-blue-100 text-blue-800 border-blue-200",
  lab_technician: "bg-green-100 text-green-800 border-green-200",
  receptionist: "bg-purple-100 text-purple-800 border-purple-200",
  viewer: "bg-gray-100 text-gray-800 border-gray-200"
};

const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    role: "admin",
    label: "Administrador",
    description: "Acceso completo al sistema. Puede gestionar usuarios, roles y toda la configuración.",
    color: "bg-red-100 text-red-800 border-red-200"
  },
  {
    role: "doctor",
    label: "Médico",
    description: "Puede crear y gestionar consentimientos de pacientes.",
    color: "bg-blue-100 text-blue-800 border-blue-200"
  },
  {
    role: "lab_technician",
    label: "Técnico de Laboratorio",
    description: "Puede crear y gestionar consentimientos relacionados con procedimientos de laboratorio.",
    color: "bg-green-100 text-green-800 border-green-200"
  },
  {
    role: "receptionist",
    label: "Recepcionista",
    description: "Puede registrar pacientes y ver información básica.",
    color: "bg-purple-100 text-purple-800 border-purple-200"
  },
  {
    role: "viewer",
    label: "Visualizador",
    description: "Solo puede ver información, sin capacidad de modificar.",
    color: "bg-gray-100 text-gray-800 border-gray-200"
  }
];

export function RoleManagement() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  
  // Permission management state
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<AppRole>("admin");
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [isAddPermissionDialogOpen, setIsAddPermissionDialogOpen] = useState(false);
  const [newPermission, setNewPermission] = useState({ key: "", label: "" });

  // Dynamic roles management state
  const [dynamicRoles, setDynamicRoles] = useState<DynamicRole[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [isRoleFormDialogOpen, setIsRoleFormDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<DynamicRole | null>(null);
  const [roleForm, setRoleForm] = useState({ name: "", display_name: "", description: "" });

  useEffect(() => {
    loadUsers();
    loadDynamicRoles();
  }, []);

  useEffect(() => {
    loadRolePermissions(selectedRoleForPermissions);
  }, [selectedRoleForPermissions]);

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

  const loadRolePermissions = async (role: AppRole) => {
    setIsLoadingPermissions(true);
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_key, permission_label, is_enabled')
        .eq('role', role)
        .order('permission_label');
      
      if (error) throw error;
      
      setRolePermissions(data || []);
    } catch (error: any) {
      console.error('Error loading permissions:', error);
      toast.error("Error al cargar permisos: " + error.message);
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  const loadDynamicRoles = async () => {
    setIsLoadingRoles(true);
    try {
      const { data, error } = await supabase.rpc('get_all_roles');
      
      if (error) throw error;
      
      setDynamicRoles(data || []);
    } catch (error: any) {
      console.error('Error loading roles:', error);
      toast.error("Error al cargar roles: " + error.message);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const openRoleFormDialog = (role?: DynamicRole) => {
    if (role) {
      setEditingRole(role);
      setRoleForm({
        name: role.name,
        display_name: role.display_name,
        description: role.description || ""
      });
    } else {
      setEditingRole(null);
      setRoleForm({ name: "", display_name: "", description: "" });
    }
    setIsRoleFormDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!roleForm.display_name.trim()) {
      toast.error("El nombre del rol es requerido");
      return;
    }

    try {
      if (editingRole) {
        // Update existing role
        const { error } = await supabase.rpc('update_role', {
          p_role_id: editingRole.id,
          p_display_name: roleForm.display_name.trim(),
          p_description: roleForm.description.trim() || null
        });

        if (error) throw error;
        toast.success("Rol actualizado exitosamente");
      } else {
        // Create new role
        if (!roleForm.name.trim()) {
          toast.error("La clave del rol es requerida");
          return;
        }

        const { error } = await supabase.rpc('create_role', {
          p_name: roleForm.name.trim(),
          p_display_name: roleForm.display_name.trim(),
          p_description: roleForm.description.trim() || null
        });

        if (error) throw error;
        toast.success("Rol creado exitosamente");
      }

      setIsRoleFormDialogOpen(false);
      setRoleForm({ name: "", display_name: "", description: "" });
      setEditingRole(null);
      loadDynamicRoles();
    } catch (error: any) {
      console.error('Error saving role:', error);
      toast.error("Error al guardar rol: " + error.message);
    }
  };

  const handleDeleteRole = async (role: DynamicRole) => {
    if (role.is_system) {
      toast.error("No se pueden eliminar roles del sistema");
      return;
    }

    if (!confirm(`¿Está seguro de eliminar el rol "${role.display_name}"?`)) return;

    try {
      const { error } = await supabase.rpc('delete_role', {
        p_role_id: role.id
      });

      if (error) throw error;

      toast.success("Rol eliminado exitosamente");
      loadDynamicRoles();
    } catch (error: any) {
      console.error('Error deleting role:', error);
      toast.error("Error al eliminar rol: " + error.message);
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
      // Usar la función segura que bypassea RLS
      const { error } = await supabase.rpc('assign_user_roles', {
        p_user_id: selectedUser.user_id,
        p_roles: selectedRoles as AppRole[]
      });

      if (error) throw error;

      toast.success("Roles actualizados exitosamente");
      setIsRoleDialogOpen(false);
      loadUsers();
    } catch (error: any) {
      console.error('Error updating roles:', error);
      toast.error("Error al actualizar roles: " + error.message);
    }
  };

  const handleTogglePermission = async (permissionKey: string, currentValue: boolean) => {
    try {
      const { error } = await supabase.rpc('update_role_permission', {
        p_role: selectedRoleForPermissions,
        p_permission_key: permissionKey,
        p_is_enabled: !currentValue
      });

      if (error) throw error;

      toast.success("Permiso actualizado");
      loadRolePermissions(selectedRoleForPermissions);
    } catch (error: any) {
      console.error('Error updating permission:', error);
      toast.error("Error al actualizar permiso: " + error.message);
    }
  };

  const handleAddPermission = async () => {
    if (!newPermission.key.trim() || !newPermission.label.trim()) {
      toast.error("Complete todos los campos");
      return;
    }

    // Validar formato del key (snake_case)
    const keyRegex = /^[a-z][a-z0-9_]*$/;
    if (!keyRegex.test(newPermission.key)) {
      toast.error("La clave debe estar en formato snake_case (ej: ver_reportes)");
      return;
    }

    try {
      const { error } = await supabase.rpc('add_role_permission', {
        p_role: selectedRoleForPermissions,
        p_permission_key: newPermission.key.trim(),
        p_permission_label: newPermission.label.trim(),
        p_is_enabled: true
      });

      if (error) throw error;

      toast.success("Permiso agregado exitosamente");
      setIsAddPermissionDialogOpen(false);
      setNewPermission({ key: "", label: "" });
      loadRolePermissions(selectedRoleForPermissions);
    } catch (error: any) {
      console.error('Error adding permission:', error);
      toast.error("Error al agregar permiso: " + error.message);
    }
  };

  const handleDeletePermission = async (permissionKey: string) => {
    if (!confirm("¿Está seguro de eliminar este permiso?")) return;

    try {
      const { error } = await supabase.rpc('delete_role_permission', {
        p_role: selectedRoleForPermissions,
        p_permission_key: permissionKey
      });

      if (error) throw error;

      toast.success("Permiso eliminado");
      loadRolePermissions(selectedRoleForPermissions);
    } catch (error: any) {
      console.error('Error deleting permission:', error);
      toast.error("Error al eliminar permiso: " + error.message);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    // First check dynamic roles
    const dynamicRole = dynamicRoles.find(r => r.name === role);
    if (dynamicRole) {
      return ROLE_COLORS[role] || "bg-indigo-100 text-indigo-800 border-indigo-200";
    }
    // Fallback to static definitions
    const roleDef = ROLE_DEFINITIONS.find(r => r.role === role);
    return roleDef?.color || "bg-indigo-100 text-indigo-800 border-indigo-200";
  };

  const getRoleLabel = (role: string) => {
    // First check dynamic roles
    const dynamicRole = dynamicRoles.find(r => r.name === role);
    if (dynamicRole) {
      return dynamicRole.display_name;
    }
    // Fallback to static definitions
    const roleDef = ROLE_DEFINITIONS.find(r => r.role === role);
    return roleDef?.label || role;
  };

  const getRoleDescription = (role: string) => {
    const dynamicRole = dynamicRoles.find(r => r.name === role);
    if (dynamicRole) {
      return dynamicRole.description || "";
    }
    const roleDef = ROLE_DEFINITIONS.find(r => r.role === role);
    return roleDef?.description || "";
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Gestión de Roles
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Gestión de Permisos
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Asignación de Roles
          </TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Gestión de Roles del Sistema
                  </CardTitle>
                  <CardDescription>
                    Cree, edite y elimine roles personalizados
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    onClick={() => openRoleFormDialog()}
                    className="bg-medical-blue hover:bg-medical-blue/90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Rol
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={loadDynamicRoles}
                    disabled={isLoadingRoles}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingRoles ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rol</TableHead>
                      <TableHead>Clave</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-center">Tipo</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dynamicRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>
                          <Badge className={ROLE_COLORS[role.name] || "bg-indigo-100 text-indigo-800 border-indigo-200"}>
                            {role.display_name}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {role.name}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate text-muted-foreground">
                          {role.description || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {role.is_system ? (
                            <Badge variant="outline" className="gap-1">
                              <Lock className="h-3 w-3" />
                              Sistema
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Personalizado</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {!role.is_system && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openRoleFormDialog(role)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteRole(role)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {role.is_system && (
                              <span className="text-sm text-muted-foreground">No editable</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {dynamicRoles.length === 0 && !isLoadingRoles && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No hay roles configurados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Configuración de Permisos por Rol
                  </CardTitle>
                  <CardDescription>
                    Active o desactive permisos para cada rol del sistema
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Select 
                    value={selectedRoleForPermissions} 
                    onValueChange={(value) => setSelectedRoleForPermissions(value as AppRole)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_DEFINITIONS.map((role) => (
                        <SelectItem key={role.role} value={role.role}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    onClick={() => loadRolePermissions(selectedRoleForPermissions)}
                    disabled={isLoadingPermissions}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingPermissions ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Role Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge className={getRoleBadgeClass(selectedRoleForPermissions)}>
                    {getRoleLabel(selectedRoleForPermissions)}
                  </Badge>
                  <p className="text-sm text-gray-600">
                    {ROLE_DEFINITIONS.find(r => r.role === selectedRoleForPermissions)?.description}
                  </p>
                </div>
              </div>

              {/* Permissions List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Permisos del Rol</h4>
                  <Button 
                    size="sm" 
                    onClick={() => setIsAddPermissionDialogOpen(true)}
                    className="bg-medical-blue hover:bg-medical-blue/90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Permiso
                  </Button>
                </div>

                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Permiso</TableHead>
                        <TableHead>Clave</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rolePermissions.map((permission) => (
                        <TableRow key={permission.permission_key}>
                          <TableCell className="font-medium">
                            {permission.permission_label}
                          </TableCell>
                          <TableCell className="text-gray-500 font-mono text-sm">
                            {permission.permission_key}
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={permission.is_enabled}
                              onCheckedChange={() => handleTogglePermission(
                                permission.permission_key, 
                                permission.is_enabled
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeletePermission(permission.permission_key)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {rolePermissions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-gray-500 py-8">
                            No hay permisos configurados para este rol
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          {/* Role Overview Cards */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Roles</CardTitle>
              <CardDescription>Vista general de todos los roles disponibles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ROLE_DEFINITIONS.map((roleDef) => (
                  <Card 
                    key={roleDef.role} 
                    className={`border-2 cursor-pointer transition-all ${
                      selectedRoleForPermissions === roleDef.role 
                        ? 'border-medical-blue ring-2 ring-medical-blue/20' 
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedRoleForPermissions(roleDef.role)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge className={roleDef.color}>{roleDef.label}</Badge>
                        <Shield className="h-4 w-4 text-gray-400" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">{roleDef.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
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
        </TabsContent>
      </Tabs>

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
                <ScrollArea className="h-[300px] pr-4">
                  {dynamicRoles.map((role) => (
                    <div
                      key={role.id}
                      className={`flex items-start space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors mb-2 ${
                        selectedRoles.includes(role.name) 
                          ? 'border-medical-blue bg-medical-blue/5' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleRoleToggle(role.name)}
                    >
                      <Checkbox
                        checked={selectedRoles.includes(role.name)}
                        onCheckedChange={() => handleRoleToggle(role.name)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={getRoleBadgeClass(role.name)}>{role.display_name}</Badge>
                          {role.is_system && (
                            <Badge variant="outline" className="text-xs">
                              <Lock className="h-3 w-3 mr-1" />
                              Sistema
                            </Badge>
                          )}
                        </div>
                        {role.description && (
                          <p className="text-sm text-gray-600 mt-1">{role.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {dynamicRoles.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      Cargando roles...
                    </p>
                  )}
                </ScrollArea>
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

      {/* Add Permission Dialog */}
      <Dialog open={isAddPermissionDialogOpen} onOpenChange={setIsAddPermissionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Agregar Nuevo Permiso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                Agregando permiso al rol: <Badge className={getRoleBadgeClass(selectedRoleForPermissions)}>
                  {getRoleLabel(selectedRoleForPermissions)}
                </Badge>
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="permission-key">Clave del Permiso</Label>
                <Input
                  id="permission-key"
                  placeholder="ej: ver_reportes"
                  value={newPermission.key}
                  onChange={(e) => setNewPermission(prev => ({ ...prev, key: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                />
                <p className="text-xs text-gray-500">Use formato snake_case (ej: crear_consentimiento)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="permission-label">Nombre del Permiso</Label>
                <Input
                  id="permission-label"
                  placeholder="ej: Ver Reportes"
                  value={newPermission.label}
                  onChange={(e) => setNewPermission(prev => ({ ...prev, label: e.target.value }))}
                />
                <p className="text-xs text-gray-500">Nombre descriptivo que verán los administradores</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddPermissionDialogOpen(false);
              setNewPermission({ key: "", label: "" });
            }}>
              Cancelar
            </Button>
            <Button onClick={handleAddPermission} className="bg-medical-blue hover:bg-medical-blue/90">
              <Save className="h-4 w-4 mr-2" />
              Guardar Permiso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Role Dialog */}
      <Dialog open={isRoleFormDialogOpen} onOpenChange={setIsRoleFormDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingRole ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              {editingRole ? "Editar Rol" : "Crear Nuevo Rol"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!editingRole && (
              <div className="space-y-2">
                <Label htmlFor="role-name">Clave del Rol *</Label>
                <Input
                  id="role-name"
                  placeholder="ej: supervisor"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm(prev => ({ 
                    ...prev, 
                    name: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') 
                  }))}
                  disabled={!!editingRole}
                />
                <p className="text-xs text-muted-foreground">
                  Identificador único en formato snake_case (no se puede cambiar después)
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="role-display-name">Nombre del Rol *</Label>
              <Input
                id="role-display-name"
                placeholder="ej: Supervisor de Área"
                value={roleForm.display_name}
                onChange={(e) => setRoleForm(prev => ({ ...prev, display_name: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Nombre visible para los usuarios
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-description">Descripción</Label>
              <Textarea
                id="role-description"
                placeholder="ej: Puede supervisar y aprobar consentimientos de su área"
                value={roleForm.description}
                onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Descripción de las responsabilidades y accesos del rol
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsRoleFormDialogOpen(false);
                setRoleForm({ name: "", display_name: "", description: "" });
                setEditingRole(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveRole} className="bg-medical-blue hover:bg-medical-blue/90">
              <Save className="h-4 w-4 mr-2" />
              {editingRole ? "Guardar Cambios" : "Crear Rol"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
