import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/safeClient';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getUserFriendlyError } from '@/lib/errorHandler';
import { ArrowLeft, UserPlus, Shield, Trash2, Calendar, UserX } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

interface Profile {
  user_id: string;
  account_type: string;
  company_name?: string;
  plan_type: string;
}

interface UserWithEmail {
  id: string;
  email: string;
  created_at: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [allUsers, setAllUsers] = useState<UserWithEmail[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminStatus();
  }, [user, navigate]);

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user?.id,
        _role: 'admin',
      });

      if (error) throw error;

      if (!data) {
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You do not have admin privileges.',
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      await loadUsers();
    } catch (error: any) {
      console.error('Admin check error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getUserFriendlyError(error),
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      // Load all users with emails
      const { data: response, error: usersError } = await supabase.functions.invoke('admin-manage-users', {
        body: { action: 'list' }
      });
      
      if (usersError) throw usersError;
      setAllUsers(response?.users || []);

      // Load roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;
      setUserRoles(rolesData || []);

      // Fetch profiles for all users
      const userIds = response?.users?.map((u: UserWithEmail) => u.id) || [];
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        const profilesMap: Record<string, Profile> = {};
        profilesData?.forEach((p) => {
          profilesMap[p.user_id] = p;
        });
        setProfiles(profilesMap);
      }
    } catch (error: any) {
      console.error('Load users error:', error);
      toast({
        variant: 'destructive',
        title: 'Error loading users',
        description: getUserFriendlyError(error),
      });
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingAdmin(true);

    try {
      const targetUser = allUsers.find((u) => u.email === newAdminEmail);

      if (!targetUser) {
        toast({
          variant: 'destructive',
          title: 'User not found',
          description: 'No user with this email exists.',
        });
        return;
      }

      // Add admin role
      const { error } = await supabase.from('user_roles').insert({
        user_id: targetUser.id,
        role: 'admin',
      });

      if (error) {
        if (error.code === '23505') {
          toast({
            variant: 'destructive',
            title: 'Already has this role',
            description: 'This user already has an admin role.',
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: 'Admin added',
        description: `${newAdminEmail} is now an admin.`,
      });

      setNewAdminEmail('');
      await loadUsers();
    } catch (error: any) {
      console.error('Add admin error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getUserFriendlyError(error),
      });
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      // Get current role
      const currentRole = userRoles.find((r) => r.user_id === userId)?.role || 'user';
      const isDemotingAdmin = currentRole === 'admin' && newRole !== 'admin';

      // Check if this is the last admin
      if (isDemotingAdmin) {
        const { count } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'admin');

        if (count && count <= 1) {
          toast({
            variant: 'destructive',
            title: 'Cannot remove last admin',
            description: 'You must promote another admin before removing this role.',
          });
          return;
        }
      }

      // Remove existing roles
      await supabase.from('user_roles').delete().eq('user_id', userId);

      // Add new role if not 'user' (users have no special role by default)
      if (newRole !== 'user') {
        const { error } = await supabase.from('user_roles').insert({
          user_id: userId,
          role: newRole as 'admin' | 'moderator' | 'user',
        });

        if (error) throw error;
      }

      toast({
        title: 'Role updated',
        description: `User role changed to ${newRole}.`,
      });

      await loadUsers();
    } catch (error: any) {
      console.error('Change role error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getUserFriendlyError(error),
      });
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    try {
      // Check if deleting the last admin
      const targetUserRole = userRoles.find((r) => r.user_id === userId);
      if (targetUserRole?.role === 'admin') {
        const { count } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'admin');

        if (count && count <= 1) {
          toast({
            variant: 'destructive',
            title: 'Cannot delete last admin',
            description: 'You must create another admin before deleting this account.',
          });
          return;
        }
      }

      const { error } = await supabase.functions.invoke('admin-manage-users', {
        body: { action: 'delete', userId }
      });

      if (error) throw error;

      toast({
        title: 'User deleted',
        description: `${email} has been permanently deleted.`,
      });

      await loadUsers();
    } catch (error: any) {
      console.error('Delete user error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: getUserFriendlyError(error),
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gradient-cyber flex items-center gap-2">
                <Shield className="w-8 h-8" />
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground">Manage users and system access</p>
            </div>
          </div>
          <Link to="/admin/events">
            <Button variant="default">
              <Calendar className="w-4 h-4 mr-2" />
              Manage Events
            </Button>
          </Link>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add New Admin
          </h2>
          <form onSubmit={handleAddAdmin} className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
            <Button type="submit" disabled={addingAdmin} className="self-end">
              {addingAdmin ? 'Adding...' : 'Add Admin'}
            </Button>
          </form>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">All Users</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Account Type</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allUsers.map((userData) => {
                  const userRole = userRoles.find((r) => r.user_id === userData.id);
                  const profile = profiles[userData.id];
                  const currentRole = userRole?.role || 'user';
                  
                  return (
                    <TableRow key={userData.id}>
                      <TableCell className="font-medium">{userData.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {profile?.account_type || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>{profile?.company_name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={profile?.plan_type === 'paid' ? 'default' : 'secondary'}>
                          {profile?.plan_type || 'free'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={currentRole}
                          onValueChange={(value) => handleChangeRole(userData.id, value)}
                          disabled={userData.id === user?.id}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {new Date(userData.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {userData.id !== user?.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <UserX className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to permanently delete {userData.email}? This will delete their account, all their events, and all associated data. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(userData.id, userData.email)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Delete User
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
