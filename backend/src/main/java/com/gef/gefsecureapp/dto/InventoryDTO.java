package com.gef.gefsecureapp.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

public class InventoryDTO {

    public enum ItemStatus { NUEVO, ACTUALIZADO, SIN_CAMBIOS, NO_RECONOCIDO, ERROR }

    @Getter @Builder
    public static class Item {
        private String coordinate;
        private String ecosystem;
        private String version;
        private String previousVersion;
        private ItemStatus status;
        private String detail;
    }

    @Getter @Builder
    public static class Summary {
        private int total;
        private int nuevos;
        private int actualizados;
        private int sinCambios;
        private int noReconocidos;
        private int errores;
        private List<Item> items;
    }
}
