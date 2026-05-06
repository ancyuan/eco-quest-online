REVOKE EXECUTE ON FUNCTION public.defend_friend_threat(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.leave_forest_sign(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.water_friend_tree_boost(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.defend_friend_threat(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_forest_sign(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.water_friend_tree_boost(uuid) TO authenticated;