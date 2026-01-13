import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Shield, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoHospital from "@/assets/logo_hospital.png";

export default function Auth() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Sign In State
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  
  // Sign Up State
  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    role: "doctor" // doctor, nurse, admin
  });

  useEffect(() => {
    // Check if user is already authenticated
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkUser();
  }, [navigate]);

  const cleanupAuthState = () => {
    // Clean up any existing auth state
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signInEmail || !signInPassword) {
      toast.error("Por favor complete todos los campos");
      return;
    }

    setIsLoading(true);
    
    try {
      // Clean up existing state
      cleanupAuthState();
      
      // Attempt global sign out first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password: signInPassword,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error("Credenciales incorrectas. Verifique su email y contraseña.");
        } else if (error.message.includes('Email not confirmed')) {
          toast.error("Por favor confirme su email antes de iniciar sesión.");
        } else {
          toast.error(`Error al iniciar sesión: ${error.message}`);
        }
        return;
      }

      if (data.user) {
        toast.success("Sesión iniciada correctamente");
        // Force page reload for clean state
        window.location.href = '/';
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error("Error inesperado al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { email, password, confirmPassword, fullName, role } = signUpData;
    
    if (!email || !password || !confirmPassword || !fullName) {
      toast.error("Por favor complete todos los campos");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            role: role
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          toast.error("Este email ya está registrado. Intente iniciar sesión.");
        } else {
          toast.error(`Error en el registro: ${error.message}`);
        }
        return;
      }

      if (data.user) {
        toast.success("Registro exitoso. Revise su email para confirmar la cuenta.");
        // Clear form
        setSignUpData({
          email: "",
          password: "",
          confirmPassword: "",
          fullName: "",
          role: "doctor"
        });
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast.error("Error inesperado en el registro");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-blue-light to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center justify-center gap-3 mb-4">
            <img 
              src={logoHospital} 
              alt="Logo E.S.E Hospital La Mesa Pedro León Álvarez Díaz" 
              className="h-40 w-auto object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-medical-blue">E.S.E Hospital La Mesa Pedro León Álvarez Díaz</h1>
              <p className="text-sm text-medical-gray">Sistema de Consentimientos Informados</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-medical-gray">
            <Shield className="h-4 w-4" />
            <span className="text-sm">Acceso Seguro para Personal Médico</span>
          </div>
        </div>

        <Card className="border-medical-blue/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-medical-blue">Autenticación</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="signup">Registrarse</TabsTrigger>
              </TabsList>

              {/* Sign In Tab */}
              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email Institucional</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="doctor@santamatilde.gov.co"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      disabled={isLoading}
                      className="border-medical-blue/30 focus:border-medical-blue"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={signInPassword}
                        onChange={(e) => setSignInPassword(e.target.value)}
                        disabled={isLoading}
                        className="border-medical-blue/30 focus:border-medical-blue pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-medical-blue hover:bg-medical-blue/90"
                    disabled={isLoading}
                  >
                    {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
                  </Button>
                </form>

                <div className="text-center">
                  <Button
                    variant="link"
                    className="text-medical-blue text-sm"
                    onClick={() => toast.info("Contacte al administrador para recuperar su contraseña")}
                  >
                    ¿Olvidó su contraseña?
                  </Button>
                </div>
              </TabsContent>

              {/* Sign Up Tab */}
              <TabsContent value="signup" className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Solo Personal Autorizado</span>
                  </div>
                  <p className="text-xs text-amber-700 mt-1">
                    El registro está limitado al personal médico autorizado del Hospital Pedro Leon Alvarez Diaz de la Mesa.
                  </p>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nombre Completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Dr. Juan Pérez"
                      value={signUpData.fullName}
                      onChange={(e) => setSignUpData(prev => ({...prev, fullName: e.target.value}))}
                      disabled={isLoading}
                      className="border-medical-blue/30 focus:border-medical-blue"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email Institucional</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="doctor@santamatilde.gov.co"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData(prev => ({...prev, email: e.target.value}))}
                      disabled={isLoading}
                      className="border-medical-blue/30 focus:border-medical-blue"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Rol en el Hospital</Label>
                    <select 
                      id="role"
                      value={signUpData.role}
                      onChange={(e) => setSignUpData(prev => ({...prev, role: e.target.value}))}
                      disabled={isLoading}
                      className="w-full px-3 py-2 border border-medical-blue/30 rounded-md focus:outline-none focus:ring-2 focus:ring-medical-blue focus:border-medical-blue"
                    >
                      <option value="doctor">Médico</option>
                      <option value="nurse">Enfermero/a</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData(prev => ({...prev, password: e.target.value}))}
                      disabled={isLoading}
                      className="border-medical-blue/30 focus:border-medical-blue"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirmar Contraseña</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="Repita la contraseña"
                      value={signUpData.confirmPassword}
                      onChange={(e) => setSignUpData(prev => ({...prev, confirmPassword: e.target.value}))}
                      disabled={isLoading}
                      className="border-medical-blue/30 focus:border-medical-blue"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-medical-blue hover:bg-medical-blue/90"
                    disabled={isLoading}
                  >
                    {isLoading ? "Registrando..." : "Crear Cuenta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <Separator className="my-6" />
            
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="border-medical-blue/30 hover:bg-medical-blue/10"
              >
                Volver al Inicio
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-medical-gray">
          <p>© 2025 Hospital Pedro Leon Alvarez Diaz de la Mesa</p>
          <p>Sistema Seguro de Consentimientos Informados</p>
        </div>
      </div>
    </div>
  );
}