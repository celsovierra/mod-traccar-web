-- Vincula as notificacoes padrao (Ignicao Ligada=160, Saiu da Cerca=139) a todos os usuarios nao-administradores que ainda nao possuem
INSERT INTO tc_user_notification (userid, notificationid)
SELECT u.id, 160
FROM tc_users u
WHERE u.administrator = 0
AND NOT EXISTS (SELECT 1 FROM tc_user_notification un WHERE un.userid = u.id AND un.notificationid = 160);

INSERT INTO tc_user_notification (userid, notificationid)
SELECT u.id, 139
FROM tc_users u
WHERE u.administrator = 0
AND NOT EXISTS (SELECT 1 FROM tc_user_notification un WHERE un.userid = u.id AND un.notificationid = 139);
