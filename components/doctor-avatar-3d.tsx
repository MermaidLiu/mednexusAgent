"use client";

import { useEffect, useRef, useState } from "react";

/** Original procedural 3D character inspired by the supplied reference, not a scan. */
export default function DoctorAvatar3D({ speaking, thinking, paused }: { speaking: boolean; thinking: boolean; paused: boolean }) {
  const host = useRef<HTMLSpanElement>(null);
  const state = useRef({ speaking, thinking, paused });
  state.current = { speaking, thinking, paused };
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    void import("three").then(T => {
      if (disposed || !host.current) return;
      const container = host.current;
      let renderer: InstanceType<typeof T.WebGLRenderer>;
      try { renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" }); }
      catch { setStatus("fallback"); return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.3;
      renderer.domElement.setAttribute("aria-hidden", "true");
      container.appendChild(renderer.domElement);
      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(30, 1, .1, 30);
      camera.position.set(0, .25, 8.3);
      camera.lookAt(0, .2, 0);
      scene.add(new T.HemisphereLight(0xd6f3ff, 0x80736c, 2.5));
      const key = new T.DirectionalLight(0xffeee0, 3.5); key.position.set(-3, 4, 5); scene.add(key);
      const rim = new T.DirectionalLight(0xa5deff, 3); rim.position.set(3, 2, -2); scene.add(rim);
      const doctor = new T.Group(); scene.add(doctor);
      const skin = new T.MeshStandardMaterial({ color: 0xe9b092, roughness: .65 });
      const white = new T.MeshStandardMaterial({ color: 0xfafcfc, roughness: .7 });
      const hair = new T.MeshStandardMaterial({ color: 0x171c25, roughness: .38 });
      const navy = new T.MeshStandardMaterial({ color: 0x193454, roughness: .75 });
      const blue = new T.MeshStandardMaterial({ color: 0x437baf, roughness: .5 });
      const black = new T.MeshStandardMaterial({ color: 0x161b24, roughness: .35 });
      const eyeWhite = new T.MeshStandardMaterial({ color: 0xfffbf4, roughness: .28 });
      const iris = new T.MeshStandardMaterial({ color: 0x4d2d23, roughness: .3 });
      const lips = new T.MeshStandardMaterial({ color: 0x9f534b, roughness: .7 });
      const sphere = new T.SphereGeometry(1, 32, 24);
      const ellipsoid = (parent: InstanceType<typeof T.Group>, mat: InstanceType<typeof T.MeshStandardMaterial>, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
        const mesh = new T.Mesh(sphere, mat); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); parent.add(mesh); return mesh;
      };
      const line = (parent: InstanceType<typeof T.Group>, points: number[][], material: InstanceType<typeof T.MeshStandardMaterial>, radius: number, closed = false) => {
        const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p as [number, number, number])), closed);
        const mesh = new T.Mesh(new T.TubeGeometry(curve, 36, radius, 8, closed), material); parent.add(mesh); return mesh;
      };
      // Coat, shirt, lapels and tie are genuine shaded volumes.
      ellipsoid(doctor, white, 0, -1.03, 0, .9, .85, .43);
      ellipsoid(doctor, navy, 0, -.63, .39, .36, .6, .12);
      for (const side of [-1, 1]) {
        const sleeve = ellipsoid(doctor, white, side * .79, -1.1, -.02, .24, .67, .28); sleeve.rotation.z = side * .18;
        const lapel = ellipsoid(doctor, white, side * .31, -.77, .44, .16, .52, .08); lapel.rotation.z = -side * .36;
      }
      ellipsoid(doctor, blue, 0, -.57, .56, .1, .12, .06);
      ellipsoid(doctor, blue, 0, -.94, .49, .085, .28, .055);
      for (const y of [-1.05, -.91, -.77]) line(doctor, [[-.06, y + .03, .545], [.06, y - .03, .545]], white, .016);
      ellipsoid(doctor, skin, 0, -.26, 0, .24, .28, .23);
      const head = new T.Group(); head.position.y = .65; doctor.add(head);
      ellipsoid(head, skin, 0, 0, 0, .79, .91, .63);
      for (const side of [-1, 1]) {
        ellipsoid(head, skin, side * .79, -.05, 0, .19, .26, .13);
        ellipsoid(head, lips, side * .86, -.05, .09, .065, .13, .025);
      }
      // Cap and swept locks stay above the forehead, leaving expressive eyes visible.
      ellipsoid(head, hair, 0, .48, -.19, .81, .52, .59);
      for (let i = 0; i < 5; i++) {
        const lock = ellipsoid(head, hair, -.49 + i * .21, .63 + Math.sin(i * .6) * .12, .24, .28, .24, .4);
        lock.rotation.z = -.42;
      }
      for (const side of [-1, 1]) ellipsoid(head, hair, side * .7, .21, -.04, .1, .32, .24);
      const eyes: InstanceType<typeof T.Group>[] = [];
      for (const side of [-1, 1]) {
        const eye = new T.Group(); eye.position.set(side * .31, .01, .565); head.add(eye); eyes.push(eye);
        ellipsoid(eye, eyeWhite, 0, 0, 0, .205, .225, .085);
        ellipsoid(eye, iris, 0, -.006, .078, .108, .146, .035);
        ellipsoid(eye, black, 0, -.002, .106, .056, .08, .015);
        ellipsoid(eye, eyeWhite, -.03, .054, .124, .03, .034, .012);
        line(head, [[side * .31 - .16, .31, .58], [side * .31, .35, .62], [side * .31 + .15, .31, .58]], hair, .042);
        const x = side * .31;
        line(head, [[x - .255, .18, .675], [x + .255, .18, .675], [x + .255, -.2, .65], [x - .255, -.2, .65]], black, .033, true);
        line(head, [[side * .56, .16, .65], [side * .76, .13, .28], [side * .76, .02, -.1]], black, .03);
      }
      line(head, [[-.055, .07, .697], [0, .095, .71], [.055, .07, .697]], black, .03);
      ellipsoid(head, skin, 0, -.15, .63, .105, .135, .13);
      const smile = line(head, [[-.2, -.39, .545], [0, -.445, .588], [.2, -.39, .545]], lips, .021);
      const mouth = ellipsoid(head, lips, 0, -.415, .57, .13, .055, .028); mouth.visible = false;
      let pointerX = 0, pointerY = 0;
      const pointer = (event: PointerEvent) => { pointerX = (event.clientX / window.innerWidth - .5) * .6; pointerY = (event.clientY / window.innerHeight - .5) * .18; };
      window.addEventListener("pointermove", pointer, { passive: true });
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      const resize = () => { const { width, height } = container.getBoundingClientRect(); if (!width || !height) return; renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); };
      const observer = new ResizeObserver(resize); observer.observe(container); resize();
      let previous = 0;
      const render = (now: number) => {
        if (disposed || document.hidden || now - previous < 32) return;
        previous = now;
        const t = now / 1000;
        const still = state.current.paused || reduced.matches;
        const talk = state.current.speaking && !still;
        doctor.position.y = still ? 0 : Math.sin(t * 1.8) * .025;
        head.rotation.y += ((still ? 0 : pointerX + Math.sin(t * .8) * .09) - head.rotation.y) * .08;
        head.rotation.x += ((still ? 0 : pointerY + (state.current.thinking ? Math.sin(t * 2) * .055 : 0)) - head.rotation.x) * .08;
        head.rotation.z = still ? 0 : Math.sin(t * .7) * .025;
        const blinkPhase = t % 4.7;
        const blink = !still && blinkPhase < .18 ? .06 + .94 * Math.abs(blinkPhase - .09) / .09 : 1;
        eyes.forEach(eye => { eye.scale.y = blink; });
        smile.visible = !talk; mouth.visible = talk;
        mouth.scale.y = .035 + (Math.sin(t * 17) * .5 + .5) * .085;
        renderer.render(scene, camera);
      };
      const lost = (event: Event) => { event.preventDefault(); renderer.setAnimationLoop(null); setStatus("fallback"); };
      renderer.domElement.addEventListener("webglcontextlost", lost);
      renderer.setAnimationLoop(render);
      setStatus("ready");
      cleanup = () => {
        renderer.setAnimationLoop(null); observer.disconnect(); window.removeEventListener("pointermove", pointer);
        renderer.domElement.removeEventListener("webglcontextlost", lost);
        const geometries = new Set<InstanceType<typeof T.BufferGeometry>>();
        scene.traverse(object => { if (object instanceof T.Mesh) geometries.add(object.geometry); });
        geometries.forEach(g => g.dispose());
        [skin, white, hair, navy, blue, black, eyeWhite, iris, lips].forEach(m => m.dispose());
        renderer.dispose(); renderer.domElement.remove();
      };
    }).catch(() => { if (!disposed) setStatus("fallback"); });
    return () => { disposed = true; cleanup(); };
  }, []);

  return <span className="doctor-avatar-3d" ref={host} role="img" aria-label={status === "ready" ? "王主任的分身，3D卡通医生" : "王主任的分身，静态备用形象"}>
    {status !== "ready" && <img src="/avatars/mednexus-doctor.jpg" alt=""/>}
    {status === "fallback" && <small>静态模式</small>}
  </span>;
}
