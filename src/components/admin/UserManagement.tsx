import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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
  Briefcase,
  Key,
  Eye,
  EyeOff,
  FileSignature,
  Upload,
  CheckCircle2,
  XCircle,
  Image as ImageIcon
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
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [existingSignature, setExistingSignature] = useState<string | null>(null);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const [userSignatures, setUserSignatures] = useState<Record<string, boolean>>({});
  const signatureFileRef = useRef<HTMLInputElement>(null);
  
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

      // Load which users have signatures
      const { data: signatures } = await supabase
        .from('professional_signatures')
        .select('created_by');
      
      const sigMap: Record<string, boolean> = {};
      signatures?.forEach(s => {
        if (s.created_by) sigMap[s.created_by] = true;
      });
      setUserSignatures(sigMap);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast.error("Error al cargar usuarios: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSignatureDialog = async (user: UserWithRole) => {
    setSelectedUser(user);
    setSignaturePreview(null);
    setExistingSignature(null);
    setIsSignatureDialogOpen(true);

    // Load existing signature for this user
    const { data } = await supabase
      .from('professional_signatures')
      .select('signature_data')
      .eq('created_by', user.user_id)
      .single();
    
    if (data?.signature_data) {
      setExistingSignature(data.signature_data);
    }
  };

  const handleSignatureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error("Formato no soportado. Use PNG, JPG o PDF.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo no debe exceder 5MB");
      return;
    }

    if (file.type === 'application/pdf') {
      // For PDF: read as data URL and render to canvas
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const pdfData = ev.target?.result as string;
          // Use pdfjsLib if available, otherwise store as-is
          // Simple approach: store the PDF base64 directly
          setSignaturePreview(pdfData);
          toast.success("PDF cargado. Se usará como firma.");
        } catch {
          toast.error("Error al procesar el PDF");
        }
      };
      reader.readAsDataURL(file);
    } else {
      // Image file: convert to base64
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new window.Image();
        img.onload = () => {
          // Resize to reasonable dimensions for signature
          const canvas = document.createElement('canvas');
          const maxW = 600;
          const maxH = 300;
          let w = img.width;
          let h = img.height;
          if (w > maxW) { h = h * maxW / w; w = maxW; }
          if (h > maxH) { w = w * maxH / h; h = maxH; }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/png');
            setSignaturePreview(dataUrl);
          }
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveSignature = async () => {
    if (!selectedUser || !signaturePreview) return;
    setIsUploadingSignature(true);

    try {
      // Check if signature already exists for this user
      const { data: existing } = await supabase
        .from('professional_signatures')
        .select('id')
        .eq('created_by', selectedUser.user_id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('professional_signatures')
          .update({
            professional_name: selectedUser.full_name || selectedUser.email,
            professional_document: selectedUser.document_number || '',
            signature_data: signaturePreview,
            updated_at: new Date().toISOString()
          })
          .eq('created_by', selectedUser.user_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('professional_signatures')
          .insert({
            professional_name: selectedUser.full_name || selectedUser.email,
            professional_document: selectedUser.document_number || '',
            signature_data: signaturePreview,
            created_by: selectedUser.user_id
          });
        if (error) throw error;
      }

      toast.success("Firma asignada exitosamente al usuario");
      setUserSignatures(prev => ({ ...prev, [selectedUser.user_id]: true }));
      setIsSignatureDialogOpen(false);
      setSignaturePreview(null);
    } catch (error: any) {
      console.error('Error saving signature:', error);
      toast.error("Error al guardar firma: " + error.message);
    } finally {
      setIsUploadingSignature(false);
    }
  };

  const handleDeleteSignature = async () => {
    if (!selectedUser) return;
    try {
      const { error } = await supabase
        .from('professional_signatures')
        .delete()
        .eq('created_by', selectedUser.user_id);
      if (error) throw error;

      toast.success("Firma eliminada");
      setExistingSignature(null);
      setUserSignatures(prev => ({ ...prev, [selectedUser.user_id]: false }));
    } catch (error: any) {
      toast.error("Error al eliminar firma: " + error.message);
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

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    if (!newPassword || newPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setIsResettingPassword(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error("No hay sesión activa");
        return;
      }

      const response = await fetch(
        `https://dbhamokkweyadibngphq.supabase.co/functions/v1/admin-reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            user_id: selectedUser.user_id,
            new_password: newPassword
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error al cambiar contraseña');
      }

      toast.success("Contraseña actualizada exitosamente");
      setIsPasswordDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error("Error: " + error.message);
    } finally {
      setIsResettingPassword(false);
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
                  <TableHead>Firma</TableHead>
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
                    <TableCell className="text-center">
                      {userSignatures[user.user_id] ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Registrada
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <XCircle className="h-3 w-3 mr-1" />
                          Sin firma
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={user.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                        {user.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsEditDialogOpen(true);
                          }}
                          title="Editar perfil"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenSignatureDialog(user)}
                          title="Gestionar firma"
                          className={userSignatures[user.user_id] 
                            ? "text-green-600 hover:text-green-700 hover:bg-green-50" 
                            : "text-muted-foreground hover:text-foreground"}
                        >
                          <FileSignature className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setNewPassword("");
                            setConfirmPassword("");
                            setIsPasswordDialogOpen(true);
                          }}
                          title="Cambiar contraseña"
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        >
                          <Key className="h-4 w-4" />
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

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-orange-600" />
              Cambiar Contraseña
            </DialogTitle>
            <DialogDescription>
              Establezca una nueva contraseña para el usuario: <strong>{selectedUser?.full_name || selectedUser?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nueva Contraseña *</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirmar Contraseña *</Label>
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita la contraseña"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-red-500">Las contraseñas no coinciden</p>
              )}
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <strong>Nota:</strong> El usuario deberá usar esta nueva contraseña la próxima vez que inicie sesión.
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsPasswordDialogOpen(false);
                setNewPassword("");
                setConfirmPassword("");
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleResetPassword}
              disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword || isResettingPassword}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isResettingPassword ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Cambiar Contraseña
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signature Upload Dialog */}
      <Dialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-primary" />
              Gestionar Firma del Profesional
            </DialogTitle>
            <DialogDescription>
              Asigne una firma digitalizada a: <strong>{selectedUser?.full_name || selectedUser?.email}</strong>
              {selectedUser?.document_number && (
                <span className="block text-xs mt-1">Documento: {selectedUser.document_number}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Existing signature */}
            {existingSignature && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Firma actual registrada
                </Label>
                <div className="border rounded-lg p-3 bg-muted/30 flex items-center justify-center">
                  <img 
                    src={existingSignature} 
                    alt="Firma actual" 
                    className="max-h-32 object-contain"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSignature}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar firma actual
                </Button>
              </div>
            )}

            {!existingSignature && !signaturePreview && (
              <div className="text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
                <XCircle className="h-4 w-4" />
                Este usuario no tiene firma registrada
              </div>
            )}

            {/* Upload new */}
            <div className="space-y-2">
              <Label>{existingSignature ? 'Reemplazar firma' : 'Subir firma'}</Label>
              <div 
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                onClick={() => signatureFileRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Haga clic para seleccionar un archivo
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG o PDF (máx. 5MB)
                </p>
              </div>
              <input
                ref={signatureFileRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                className="hidden"
                onChange={handleSignatureFileChange}
              />
            </div>

            {/* Preview */}
            {signaturePreview && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Vista previa de la nueva firma
                </Label>
                <div className="border rounded-lg p-3 bg-muted/30 flex items-center justify-center">
                  {signaturePreview.startsWith('data:application/pdf') ? (
                    <div className="text-center text-sm text-muted-foreground">
                      <FileSignature className="h-12 w-12 mx-auto mb-2" />
                      Archivo PDF cargado
                    </div>
                  ) : (
                    <img 
                      src={signaturePreview} 
                      alt="Preview firma" 
                      className="max-h-32 object-contain"
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSignatureDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveSignature}
              disabled={!signaturePreview || isUploadingSignature}
              className="bg-primary hover:bg-primary/90"
            >
              {isUploadingSignature ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <FileSignature className="h-4 w-4 mr-2" />
                  Asignar Firma
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
