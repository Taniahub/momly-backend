
-- ===============================
-- BASE DE DATOS MOMLY (MySQL)
-- ===============================

CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100),
    correo VARCHAR(150) UNIQUE,
    password VARCHAR(255),
    tipo_usuario ENUM('free','premium') DEFAULT 'free',
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado BOOLEAN DEFAULT 1
);

CREATE TABLE vacunas (
    id_vacuna INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100),
    edad_aplicacion_meses INT
);

CREATE TABLE publicaciones (
    id_publicacion INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    contenido TEXT,
    fecha_publicacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('activo','moderado'),
    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
);

CREATE TABLE bebes (
    id_bebe INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    nombre VARCHAR(100),
    fecha_nacimiento DATE,
    genero VARCHAR(20),
    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
);

CREATE INDEX idx_bebe_usuario
ON bebes(id_usuario);

CREATE TABLE vacunas_bebe (
    id_vacuna_bebe INT AUTO_INCREMENT PRIMARY KEY,
    id_bebe INT NOT NULL,
    id_vacuna INT NOT NULL,
    fecha_aplicacion DATE,
    observaciones TEXT,
    FOREIGN KEY (id_bebe)
        REFERENCES bebes(id_bebe),
    FOREIGN KEY (id_vacuna)
        REFERENCES vacunas(id_vacuna),
    UNIQUE (id_bebe, id_vacuna)
);

CREATE TABLE registro_bienestar (
    id_registro INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    estado_emocional VARCHAR(50),
    nota TEXT,
    fecha_registro DATE DEFAULT (CURRENT_DATE),
    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario),
    UNIQUE (id_usuario, fecha_registro)
);

CREATE TABLE reacciones (
    id_reaccion INT AUTO_INCREMENT PRIMARY KEY,
    id_publicacion INT NOT NULL,
    id_usuario INT NOT NULL,
    tipo_reaccion VARCHAR(20),
    fecha_reaccion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_publicacion)
        REFERENCES publicaciones(id_publicacion),
    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario),
    UNIQUE (id_publicacion, id_usuario)
);

CREATE TABLE suscripciones (
    id_suscripcion INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    fecha_inicio DATE,
    fecha_fin DATE,
    estado ENUM('activa','cancelada','expirada'),
    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
);

CREATE TABLE citas (
    id_cita INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    titulo VARCHAR(150),
    descripcion TEXT,
    fecha_hora DATETIME,
    recordatorio BOOLEAN,
    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
);

CREATE TABLE categorias_contenido (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100)
);

CREATE TABLE contenidos (
    id_contenido INT AUTO_INCREMENT PRIMARY KEY,
    id_categoria INT,
    titulo VARCHAR(150),
    descripcion TEXT,
    tipo ENUM('guia','articulo','video'),
    url_contenido TEXT,
    es_premium BOOLEAN DEFAULT 0,
    FOREIGN KEY (id_categoria)
        REFERENCES categorias_contenido(id_categoria)
);

CREATE TABLE descargas (
    id_descarga INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    id_contenido INT,
    fecha_descarga DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_contenido)
        REFERENCES contenidos(id_contenido)
);

CREATE TABLE comentarios (
    id_comentario INT AUTO_INCREMENT PRIMARY KEY,
    id_publicacion INT,
    id_usuario INT,
    comentario TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_publicacion)
        REFERENCES publicaciones(id_publicacion),
    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
);

CREATE TABLE especialistas (
    id_especialista INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150),
    especialidad VARCHAR(100),
    descripcion TEXT
);

CREATE TABLE consultas_especialista (
    id_consulta INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    id_especialista INT,
    fecha DATETIME,
    estado VARCHAR(50),
    FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_especialista)
        REFERENCES especialistas(id_especialista)
);
