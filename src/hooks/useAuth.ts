import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { checkAuth, login as apiLogin, logout as apiLogout } from '../api/client'

export function useAuth() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['auth'],
    queryFn: checkAuth,
    staleTime: Infinity
  })

  const loginMutation = useMutation({
    mutationFn: apiLogin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    }
  })

  const logoutMutation = useMutation({
    mutationFn: apiLogout,
    onSuccess: () => {
      queryClient.setQueryData(['auth'], { authenticated: false })
      queryClient.clear()
    }
  })

  return {
    isAuthenticated: data?.authenticated ?? false,
    isCheckingAuth: isLoading,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error as Error | null,
    logout: () => logoutMutation.mutate()
  }
}
