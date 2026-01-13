import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  Shield, 
  User,
  RefreshCw,
  Mail,
  Phone,
  Building,
  Briefcase
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface UserWithRole {
  user_id: string;
  email: string;
  full_name: string | null;
  document_type: string | null;
  document_number: string | null;
  phone: string | null;
  department: string | null;
  job_title: string | null;
  is_active: boolean;
  roles: string[];
  user_created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  doctor: "Médico",
  lab_technician: "Técnico de Laboratorio",
  receptionist: "Recepcionista",
  viewer: "Visualizador"
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-800 border-red-200",
  doctor: "bg-blue-100 text-blue-800 border-blue-200",
  lab_technician: "bg-green-100 text-green-800 border-green-200",
  receptionist: "bg-purple-100 text-purple-800 border-purple-200",
  viewer: "bg-gray-100 text-gray-800 border-gray-200"
};

export function UserManagement() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    document_type: "CC",
    document_number: "",
    phone: "",
    department: "",
    job_title: "",
    role: "viewer"
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user => 
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.document_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_users_with_roles');
      
      if (error) throw error;
      
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast.error("Error al cargar usuarios: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      // Create user via Supabase Auth Admin (this requires service role)
      // For now, we'll create the user with signUp and then update their profile
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.full_name
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (authError) throw authError;
      
      if (authData.user) {
        // Update profile with additional info
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: authData.user.id,
            full_name: newUser.full_name,
            document_type: newUser.document_type,
            document_number: newUser.document_number,
            phone: newUser.phone,
            department: newUser.department,
            job_title: newUser.job_title,
            is_active: true
          });
        
        if (profileError) {
          console.error('Profile error:', profileError);
        }

        // Assign role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: newUser.role as any
          });

        if (roleError) {
          console.error('Role error:', roleError);
        }
      }

      toast.success("Usuario creado exitosamente. Se ha enviado un correo de confirmación.");
      setIsCreateDialogOpen(false);
      setNewUser({
        email: "",
        password: "",
        full_name: "",
        document_type: "CC",
        document_number: "",
        phone: "",
        department: "",
        job_title: "",
        role: "viewer"
      });
      loadUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error("Error al crear usuario: " + error.message);
    }
  };

  const handleUpdateProfile = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: selectedUser.user_id,
          full_name: selectedUser.full_name,
          document_type: selectedUser.document_type,
          document_number: selectedUser.document_number,
          phone: selectedUser.phone,
          department: selectedUser.department,
          job_title: selectedUser.job_title,
          is_active: selectedUser.is_active
        });

      if (error) throw error;

      toast.success("Perfil actualizado exitosamente");
      setIsEditDialogOpen(false);
      loadUsers();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error("Error al actualizar perfil: " + error.message);
    }
  };

  const handleToggleActive = async (user: UserWithRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !user.is_active })
        .eq('user_id', user.user_id);

      if (error) throw error;

      toast.success(user.is_active ? "Usuario desactivado" : "Usuario activado");
      loadUsers();
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      toast.error("Error al cambiar estado: " + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Gestión de Usuarios del Sistema
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={loadUsers} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-medical-blue hover:bg-medical-blue/90">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Nuevo Usuario
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Correo Electrónico *</Label>
                        <Input
                          type="email"
                          value={newUser.email}
                          onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                          placeholder="correo@hospital.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Contraseña *</Label>
                        <Input
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Nombre Completo *</Label>
                      <Input
                        value={newUser.full_name}
                        onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                        placeholder="Nombre del usuario"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo Documento</Label>
                        <Select 
                          value={newUser.document_type} 
                          onValueChange={(value) => setNewUser({...newUser, document_type: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                            <SelectItem value="CE">Cédula de Extranjería</SelectItem>
                            <SelectItem value="PA">Pasaporte</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Número Documento</Label>
                        <Input
                          value={newUser.document_number}
                          onChange={(e) => setNewUser({...newUser, document_number: e.target.value})}
                          placeholder="1234567890"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Teléfono</Label>
                        <Input
                          value={newUser.phone}
                          onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                          placeholder="3001234567"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Rol *</Label>
                        <Select 
                          value={newUser.role} 
                          onValueChange={(value) => setNewUser({...newUser, role: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="doctor">Médico</SelectItem>
                            <SelectItem value="lab_technician">Técnico de Laboratorio</SelectItem>
                            <SelectItem value="receptionist">Recepcionista</SelectItem>
                            <SelectItem value="viewer">Visualizador</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Departamento</Label>
                        <Input
                          value={newUser.department}
                          onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                          placeholder="Laboratorio Clínico"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cargo</Label>
                        <Input
                          value={newUser.job_title}
                          onChange={(e) => setNewUser({...newUser, job_title: e.target.value})}
                          placeholder="Bacteriólogo"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleCreateUser}
                      disabled={!newUser.email || !newUser.password || !newUser.full_name}
                      className="bg-medical-blue hover:bg-medical-blue/90"
                    >
                      Crear Usuario
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, correo o documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="outline">
              {filteredUsers.length} usuarios
            </Badge>
          </div>

          {/* Users Table */}
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.full_name || 'Sin nombre'}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{user.document_type || '-'}</p>
                        <p className="text-gray-500">{user.document_number || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {user.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {user.department && (
                          <div className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {user.department}
                          </div>
                        )}
                        {user.job_title && (
                          <div className="flex items-center gap-1 text-gray-500">
                            <Briefcase className="h-3 w-3" />
                            {user.job_title}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map((role, idx) => (
                            <Badge key={idx} className={ROLE_COLORS[role] || ROLE_COLORS.viewer}>
                              {ROLE_LABELS[role] || role}
                            </Badge>
                          ))
                        ) : (
                          <Badge className={ROLE_COLORS.viewer}>Sin rol</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={user.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                        {user.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={user.is_active}
                          onCheckedChange={() => handleToggleActive(user)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Correo Electrónico</Label>
                <Input value={selectedUser.email} disabled className="bg-gray-50" />
              </div>
              <div className="space-y-2">
                <Label>Nombre Completo</Label>
                <Input
                  value={selectedUser.full_name || ''}
                  onChange={(e) => setSelectedUser({...selectedUser, full_name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo Documento</Label>
                  <Select 
                    value={selectedUser.document_type || ''} 
                    onValueChange={(value) => setSelectedUser({...selectedUser, document_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                      <SelectItem value="CE">Cédula de Extranjería</SelectItem>
                      <SelectItem value="PA">Pasaporte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Número Documento</Label>
                  <Input
                    value={selectedUser.document_number || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, document_number: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={selectedUser.phone || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Departamento</Label>
                  <Input
                    value={selectedUser.department || ''}
                    onChange={(e) => setSelectedUser({...selectedUser, department: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input
                  value={selectedUser.job_title || ''}
                  onChange={(e) => setSelectedUser({...selectedUser, job_title: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={selectedUser.is_active}
                  onCheckedChange={(checked) => setSelectedUser({...selectedUser, is_active: checked})}
                />
                <Label>Usuario Activo</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateProfile} className="bg-medical-blue hover:bg-medical-blue/90">
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
