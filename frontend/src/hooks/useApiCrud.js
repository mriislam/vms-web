import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';

/**
 * Generic CRUD hook for any API service.
 * @param {string} queryKey  - React Query cache key (e.g. 'vehicles')
 * @param {object} service   - Service with getAll / create / update / remove
 * @param {object} options   - { onSaveSuccess, onDeleteSuccess }
 */
export function useApiCrud(queryKey, service, options = {}) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [queryKey] });

  const query = useQuery({
    queryKey: [queryKey],
    queryFn: () => service.getAll().then((r) => r.data.data ?? []),
  });

  const createMut = useMutation({
    mutationFn: (data) => service.create(data),
    onSuccess: () => {
      invalidate();
      message.success('Record added successfully');
      options.onSaveSuccess?.();
    },
    onError: (e) => message.error(e?.response?.data?.message ?? 'Failed to save'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => service.update(id, data),
    onSuccess: () => {
      invalidate();
      message.success('Record updated successfully');
      options.onSaveSuccess?.();
    },
    onError: (e) => message.error(e?.response?.data?.message ?? 'Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => service.remove(id),
    onSuccess: () => {
      invalidate();
      message.success('Record deleted');
      options.onDeleteSuccess?.();
    },
    onError: (e) => message.error(e?.response?.data?.message ?? 'Failed to delete'),
  });

  const save = (id, data) =>
    id ? updateMut.mutate({ id, data }) : createMut.mutate(data);

  const remove = (id) => deleteMut.mutate(id);

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    save,
    remove,
    isSaving: createMut.isPending || updateMut.isPending,
    isDeleting: deleteMut.isPending,
  };
}
