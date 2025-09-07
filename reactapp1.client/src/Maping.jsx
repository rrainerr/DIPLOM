import React, { useEffect, useState, useRef } from 'react';
import { Map, View } from 'ol';
import { fromLonLat } from 'ol/proj';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { OSM, Vector as VectorSource } from 'ol/source';
import { Feature } from 'ol';
import { Point, LineString } from 'ol/geom';
import { Style, Icon, Text, Stroke, Fill, RegularShape, Circle } from 'ol/style';
import 'ol/ol.css';
import { useLocation } from 'react-router-dom';
import { Layout, Row, Col, Table, Drawer, Descriptions, Button, Modal, Input, message, Card } from 'antd';

const { Content } = Layout;

const Mapp = () => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const vectorSourceRef = useRef(new VectorSource());
    const location = useLocation();
    const user = JSON.parse(sessionStorage.getItem('user'));

    const getRoute = async (start, end) => {
        try {
            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`
            );
            if (!response.ok) throw new Error('Ошибка при получении маршрута');
            const data = await response.json();
            return data.routes[0].geometry.coordinates;
        } catch (error) {
            console.error('Ошибка при получении маршрута:', error);
            return null;
        }
    };

    const addRouteToMap = (coordinates) => {
        const routeFeature = new Feature({
            geometry: new LineString(coordinates),
        });

        const routeStyle = new Style({
            stroke: new Stroke({
                color: 'blue',
                width: 3,
            }),
        });

        routeFeature.setStyle(routeStyle);
        vectorSourceRef.current.addFeature(routeFeature);
    };

    const fetchLinkedWells = async (wellId) => {
        try {
            const response = await fetch('/api/well/map/point');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            console.log('Данные связей:', data);

            const linkedWellsData = data.$values || data;

            if (!Array.isArray(linkedWellsData)) {
                throw new Error('Не удалось загрузить');
            }

            setLinkedWells(linkedWellsData);
        } catch (error) {
            console.error('Не удалось загрузить:', error);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                const response = await fetch('/api/well/map/point');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const data = await response.json();
                console.log('АПИ:', data);

                const pointsData = data.$values || data;

                if (!Array.isArray(pointsData)) {
                    throw new Error('Не удалось загрузить');
                }

                const newFeatures = [];

                pointsData.forEach((point) => {
                    const coords = fromLonLat([point.longitude, point.latitude]);
                    const feature = new Feature({
                        geometry: new Point(coords),
                        name: point.name,
                        info: point,
                    });

                    const iconSrc = point.idType === 2 ? '/well-icon.png' : '/well-icon1.png';

                    feature.setStyle((feature, resolution) => {
                        const scale = 0.8 / resolution;
                        const fontSize = 140 / resolution;

                        return new Style({
                            image: new Icon({
                                src: iconSrc,
                                scale: scale,
                            }),
                            text: new Text({
                                text: point.name,
                                font: `${fontSize}px Calibri,sans-serif`,
                                fill: new Fill({ color: '#000' }),
                                stroke: new Stroke({
                                    color: '#fff',
                                    width: 2,
                                }),
                                offsetY: 25,
                            }),
                        });
                    });

                    newFeatures.push(feature);
                    if (point.links && point.links.$values && Array.isArray(point.links.$values)) {
                        point.links.$values.forEach(async (link) => {
                            const linkedWell = pointsData.find((w) => w.idWell === link.wellLink);
                            if (linkedWell) {
                     
                                const route = await getRoute([point.longitude, point.latitude], [linkedWell.longitude, linkedWell.latitude]);
                                if (route) {
                                    addRouteToMap(route.map(coord => fromLonLat(coord)));
                                }
                            }
                        });
                    }
                });

                vectorSourceRef.current.clear();
                vectorSourceRef.current.addFeatures(newFeatures);
            } catch (error) {
                console.error('Не удалось загрузить:', error);
            }
        };

        loadData();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const wellId = params.get('wellId');

        if (wellId) {
            fetchLinkedWells(wellId);
        }

        if (!mapRef.current) return;

        if (!mapInstance.current) {
            const map = new Map({
                target: mapRef.current,
                layers: [
                    new TileLayer({ source: new OSM() }),
                    new VectorLayer({ source: vectorSourceRef.current }),
                ],
                view: new View({
                    center: fromLonLat([37.6173, 55.7558]),
                    zoom: 10,
                }),
            });

            map.on('singleclick', (event) => {
                const clickedFeatures = [];
                map.forEachFeatureAtPixel(event.pixel, (feature) => {
                    if (feature.getGeometry().getType() === 'Point') {
                        clickedFeatures.push(feature);
                    }
                });

                if (clickedFeatures.length === 0) return;

                const pointData = clickedFeatures[0].get('info');

                if (!pointData || !pointData.idWell) {
                    console.warn('Не удалось загрузить:', pointData);
                    return;
                }

                setSelectedPoint(pointData);
                setDrawerVisible(true);
            });

            const longitude = parseFloat(params.get('longitude'));
            const latitude = parseFloat(params.get('latitude'));

            if (!isNaN(longitude) && !isNaN(latitude)) {
                const coords = fromLonLat([longitude, latitude]);
                map.getView().setCenter(coords);
                map.getView().setZoom(14);
            }

            mapInstance.current = map;
        }
    }, [location]);



    return (
        <Layout>
            <Content>
                        <div
                            ref={mapRef}
                            style={{
                                width: '100%',
                                height: '800px',
                                border: '2px solid #ccc',
                                borderRadius: '8px',
                                marginTop: '10px',
                            }}
                        />
 
            </Content>
        </Layout>
    );
};

export default Mapp;
