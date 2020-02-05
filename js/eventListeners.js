var isUserInteracting = false;
var isRightClick = false;
var noZoomLevel = 70;

function onDocumentMouseDown(event) {
  event.preventDefault();
  if (event.which === 3) {
    isRightClick = true;
  }
  isUserInteracting = true;
  onPointerDownPointerX = event.clientX;
  onPointerDownPointerY = event.clientY;
  onPointerDownLon = lon;
  onPointerDownLat = lat;
  var mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  var mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
  var vector = new THREE.Vector3(mouseX, mouseY, 0.5);
  projector.unprojectVector(vector, camera);
  var raycaster = new THREE.Raycaster(
    camera.position,
    vector.sub(camera.position).normalize()
  );
  var intersects = raycaster.intersectObjects(markers, true);
  if (intersects[0] !== undefined) {
    interactiveObject = intersects[0].object;
    manageHotspot();
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  rendererCSS.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseMove(event) {
  if (isUserInteracting && interactiveObject === undefined) {
    lon = mod(
      (onPointerDownPointerX - event.clientX) * 0.1 + onPointerDownLon,
      360
    );
    var rawLat =
      (event.clientY - onPointerDownPointerY) * 0.1 + onPointerDownLat;
    lat = Math.max(rawLat, latLimit);
  }
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onDocumentMouseUp(event) {
  camera.remove(arrow);
  event.preventDefault();
  isRightClick = false;
  isUserInteracting = false;
  interactiveObject = undefined;

  var point1 = new THREE.Vector3(-3, 0, 210);
  var point2 = new THREE.Vector3(
    camera.target.x,
    -camera.target.y,
    camera.target.z
  );
  var direction = new THREE.Vector3().subVectors(point2, point1);
  arrow = new THREE.ArrowHelper(direction.normalize(), point2);

  arrow.position.set(0, 0, -5);
  camera.add(arrow);
}

function onDocumentMouseWheel(event) {
  if (!amILoading) {
    var delta;
    if (event.wheelDeltaY) {
      delta = event.wheelDeltaY;
    } else if (event.wheelDelta) {
      delta = event.wheelDelta;
    } else if (event.detail) {
      delta = event.detail;
    }
    var sub = fov - Math.min(delta * 0.05, 2);
    var zoom = maxZoom;
    var indice = whichTransitionDirection();
    if ((indice !== undefined) & (delta > 0)) {
      zoom = ZoomArray[indice]["ZoomNext"];
    }
    if (zoom <= sub && sub <= minZoom) {
      if (event.wheelDeltaY) {
        fov -= Math.min(delta * 0.05, 2);
      } else if (event.wheelDelta) {
        fov -= Math.min(delta * 0.05, 2);
      } else if (event.detail) {
        fov += Math.min(delta * 1.0, 2);
      }

      camera.projectionMatrix.makePerspective(
        fov,
        window.innerWidth / window.innerHeight,
        1,
        1100
      );
      render();
    }
    if ((sub < zoom) & (delta > 0)) {
      getNewPanorama(panoId);
    }
    if ((delta < 0) & (fov >= parseFloat(minZoom - 2))) {
      // 69. FIXME
      var previousPanoArray = getContent("previousPano", panoId);
      while (previousPanoArray.length > 0) {
        var candidatePreviousPano = previousPanoArray.pop();
        if (
          (Math.abs(lat - candidatePreviousPano["LatitudeOnLoad"]) < 20) &
          (Math.abs(lon - candidatePreviousPano["LongitudeOnLoad"]) < 20)
        ) {
          smoothLonLatTransition(
            candidatePreviousPano["LongitudeOnLoad"],
            candidatePreviousPano["LatitudeOnLoad"],
            0.5
          );
          load(
            candidatePreviousPano["IdCalling"],
            candidatePreviousPano["Latitude"],
            candidatePreviousPano["Longitude"]
          );
          //qui non passo i valori attuali perché non voglio fare la transizione smooth
        }
      }
    }
  }
}

function onDocumentDoubleclick(event) {
  var predefinedZoom = Math.floor(((minZoom - maxZoom) / 3) * 1000) / 1000;
  var zoom = maxZoom;
  var indice = whichTransitionDirection();
  if (indice !== undefined) {
    zoom = ZoomArray[indice]["ZoomNext"];
  }
  var newFov = fov - predefinedZoom;
  if (zoom < newFov && newFov < minZoom) {
    fov -= predefinedZoom;
    camera.projectionMatrix.makePerspective(
      fov,
      window.innerWidth / window.innerHeight,
      1,
      1100
    );
    render();
  } else {
    var found = getNewPanorama(panoId);
    if (!found) {
      fov = 70;
      camera.projectionMatrix.makePerspective(
        fov,
        window.innerWidth / window.innerHeight,
        1,
        1100
      );
      render();
    }
  }
}

function onDocumentRightClick(event) {
  isRightClick = true;
}

function printLonLatInfo() {
  console.log("Longitude: " + lon);
  console.log("Latitude: " + lat);
}

function isZoomIn(previousFov, fov) {
  return previousFov > fov ? true : false;
}

function XYZtoLonLat(x, y, z) {
  var lonLat = [];
  lonLat[1] =
    Math.acos(y / Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(z, 2))) -
    Math.PI / 2;
  lonLat[1] *= 180 / Math.PI;
  lonLat[1] = Math.max(lonLat[1], latLimit); //BOH
  if (x >= 0) lonLat[0] = Math.atan(z / x);
  else lonLat[0] = Math.atan(z / x) + Math.PI;
  lonLat[0] *= 180 / Math.PI;
  lonLat[0] = mod(lonLat[0], 360); //BOH
  return lonLat;
}
