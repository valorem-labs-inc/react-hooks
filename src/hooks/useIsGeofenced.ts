import { useQuery } from '@tanstack/react-query';
import { geofenced } from '../lib/codegen/auth-Auth_connectquery';

/**
 * Custom wrapper hook that retrieves geofencing information.
 *
 * All params are optional.
 * @see {@link https://tanstack.com/query/v4/docs/react/reference/useQuery | useQuery Docs }
 * @returns An object containing the a boolean `isGeofenced` and the rest of useQuery's return.
 */
export function useIsGeofenced(queryProps: {
  enabled?: boolean;
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  refetchOnReconnect?: boolean;
  keepPreviousData?: boolean;
  cacheTime?: number;
  staleTime?: number;
}) {
  const { data: isGeofenced, ...rest } = useQuery({
    ...geofenced.useQuery({}),
    ...queryProps,
  });

  return { isGeofenced, ...rest };
}
