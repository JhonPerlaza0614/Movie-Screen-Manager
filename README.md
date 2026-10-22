-- Crear la tabla de licencias/keys
CREATE TABLE pantalla_keys (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key_pantalla TEXT NOT NULL,
    numero_comprador TEXT NOT NULL,
    proveedor TEXT NOT NULL CHECK (proveedor IN ('g2a', 'royalkeys', 'nfkeys')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID DEFAULT auth.uid() -- Opcional: Asocia el registro al usuario autenticado
);

-- 1. Habilitar RLS en la tabla
ALTER TABLE pantalla_keys ENABLE ROW LEVEL SECURITY;

-- 2. Permitir lectura solo de los registros creados por el usuario autenticado
CREATE POLICY "Permitir lectura a propietarios" 
ON pantalla_keys 
FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- 3. Permitir inserción vinculando automáticamente el usuario autenticado
CREATE POLICY "Permitir insercion a usuarios autenticados" 
ON pantalla_keys 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- 4. Permitir actualización solo de sus propios registros
CREATE POLICY "Permitir actualizacion a propietarios" 
ON pantalla_keys 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Permitir eliminación solo de sus propios registros
CREATE POLICY "Permitir eliminacion a propietarios" 
ON pantalla_keys 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

## Puesta en marcha

1. En Supabase, ejecuta el SQL anterior en el SQL Editor.
2. Copia la URL del proyecto y la clave pública `anon` en el archivo `.env`:

   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anon-publica
   ```

3. Instala dependencias y arranca la aplicación:

   ```bash
   npm install
   npm run dev
   ```

La aplicación incluye registro e inicio de sesión con Supabase para cumplir las
políticas RLS de la tabla. En el proveedor `g2a`, el valor de
`key_pantalla` se guarda en una sola celda con el formato exacto:
`correo@ejemplo.com / contraseña`. La misma cadena se muestra en el listado.

El header incluye enlaces directos a RoyalKeys, NFKeys y al panel de claves de
G2A. El archivo `.env` está excluido de Git para no publicar credenciales.
