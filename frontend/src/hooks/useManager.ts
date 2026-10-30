import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import type {
  Manager,
  ManagerCreateInput,
  DemandModelInfo,
  DemandPredictionResult,
  DemandPredictionHistoryItem,
} from "@/managerTypes";

// Manager auth is a separate cookie/session from customers; "manager-me" is null when signed out.
export function useManagerMe() {
  return useQuery({
    queryKey: ["manager", "me"],
    queryFn: () => apiGet<Manager | null>("/manager/auth/me"),
    retry: false,
  });
}

export function useManagerLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => apiPost<Manager>("/manager/auth/login", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["manager"] }),
  });
}

export function useManagerLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost("/manager/auth/logout"),
    onSettled: () => qc.removeQueries({ queryKey: ["manager"] }),
  });
}

export function useAddManager() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ManagerCreateInput) => apiPost<Manager>("/manager/team", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["manager", "team"] }),
  });
}

// ----------------- Decision Tree Demand Predictor Hooks -----------------
export function useDemandModelInfo() {
  return useQuery({
    queryKey: ["manager", "demand", "model"],
    queryFn: () => apiGet<DemandModelInfo>("/manager/demand/model"),
  });
}

export function useDemandHistory() {
  return useQuery({
    queryKey: ["manager", "demand", "history"],
    queryFn: () => apiGet<DemandPredictionHistoryItem[]>("/manager/demand/history"),
  });
}

export function usePredictDemand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, any>) => apiPost<DemandPredictionResult>("/manager/demand/predict", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["manager", "demand", "history"] }),
  });
}

export function useApproveLaunch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, any>) => apiPost<any>("/manager/demand/approve-launch", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manager", "demand", "history"] });
      qc.invalidateQueries({ queryKey: ["manager", "overview"] });
      qc.invalidateQueries({ queryKey: ["manager", "inventory"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useRetrainDemandModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost<DemandModelInfo>("/manager/demand/retrain"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manager", "demand", "model"] });
    },
  });
}

