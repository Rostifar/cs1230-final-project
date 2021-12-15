# MandelViewer
![Fractal](https://github.com/Rostifar/cs1230-final-project/blob/master/logo.png?raw=true)

## About 
MandelViewer is a realtime, QT-based 3D fractal viewer and supports the following fractal types: 
* Mandelbulb 
* 4D Julia Quaternion 
* Mandelbox 

MandelViewer uses raymarching and signed distance fields to render fractals, all of which 
done in the fragment shader *raymarch.frag*. The viewer also supports: 
* The Phong illumination model for per-fragment illumination  
* Soft shadows 
* Orbit trap coloring 
* Ambient occlusion 
* Time-varying animations for both the Mandelbulb and Julia Quaternion fractals 
* A dynamic, starry background computed using random noise 
* A UI for changing fractal, lighting, or coloring parameters 

## Installation 
The following tutorial assumes you've already installed QT Creator. First, clone the repository and open 
*final.pro* in QT Creator. Compile and run the program in **Release mode**.

## User Guide 
After launching MandelViewer, you will be created with a simple interface: 

![Menu](https://github.com/Rostifar/cs1230-final-project/blob/master/menu.png?raw=true)

The left side of the menu contains various sliders and checkboxes for changing the appearance of 
the fractal. The first block of controls changes the lighting for the scene: 
* ka => ambient lighting constant for illumination 
* kd => diffuse lighting constant for illumination 
* ks => specular lighting constant for illumination 
* Light 1 => toggles on/off a light centered at (5, 5, 5) in world space 
* Light 2 => toggles on/off a light cenetered at (-5, -5, -5) in world space 
* AO => changes the amount of ambient occlusion 

The next block of controls changes the coloring of the fractal: 
* Ambient Color => color of ambient light 
* Base Color => main color of the fractal 
* x Trap => fractal color computed based on distance from X = 0 plane 
* y Trap => fractal color computed based on distance from Y = 0 plane 
* z Trap => fractal color computed based on distance from Z = 0 plane 
* o Trap => fractal color computed based on distance from origin 
* orbit mix => how much to linearly interpolate the base color and the orbit trap colors 

The next block of controls changes the parameters of the fractal:
* Power (only for Mandelbulb) => The mandelbulb is defined by the equation Z = Z^power + C. Hence, 
                                 this parameter essentially controls the "rate of convergence" of 
                                 the fractal. 
* RM Steps => how many steps to take when raymarching 
* Iterations => controls how closely we approximate the distance to the current fractal (i.e. how 
                accurate the SDF is)
* Step factor => controls the size of steps we take when raymarching (smaller => more detailed rendering)
* Bailout => controls radius of convergence of the fractal; smaller bailout values implies we 
             stop computing the fractal's SDF sooner 

The next block of controls changes the current fractal, and the final block of controls performs the 
following functions: 

* Use FreeMode => changes the camera mode of the viewer; see the Camera Mode subsection below for 
                  detailed information
* Animate => if set, the fractal parameters will change based on time, creating neat animations 


### Camera Mode (PLEASE READ)
MandelViewer implements two camera modes: a FreeMode and a FixedMode. When MandelViewer is first 
launched, FreeMode will automatically be enabeled. In this mode, the mouse cursor is hidden and 
the fractal will rotate as you move your mouse; you can also scroll to zoom in or out of the fractal. 
FreeMode allows you to freely explore the fractal. In FixedMode, the camera will move around 
the fractal according to a fixed path. 

**To exit FreeMode** and enter FixedMode, press **t** on your keyboard; at this point your mouse cursor should appear. Then, unselect FreeMode on the UI. At this point, the camera should be panning around the fractal in a circle. If the **t** command isn't working, you may need to click on the viewer and try again. 

**To exit FixedMode** and enter FreeMode, select FreeMode on the UI and hit the **t** key to hide you cursor. 
If the **t** command isn't working, you may need to click on the viewer and try again. 

## System Requirements 
The following specifications are recommended: 
* Operating System: Linux or Windows 10
* CPU: Most x86_64 Quad Core CPUs should work fine; Apple Silicon CPUs haven't been tested. 
* GPU: Dedicated GPU with at least 4GB of VRAM (e.g. AMD RX 580 or NVIDIA 1080). 

Note: The viewer will run on most modern laptops; however, the performance might be subpar.  

## Known Bugs 
When running the viewer on a Windows 10, the mouse pointer will not be hidden in camera mode. 
This is a bug with QT that has not been resolved: https://bugreports.qt.io/browse/QTBUG-56828. 
No other bugs are known at this time. 



