-- 1. Crear la base de datos para n8n
CREATE DATABASE n8n;

-- 2. Asignar el dueño para que n8n tenga control total sobre su esquema
ALTER DATABASE n8n OWNER TO security_user;

-- 3. Por seguridad, también otorgamos los privilegios
GRANT ALL PRIVILEGES ON DATABASE n8n TO security_user;