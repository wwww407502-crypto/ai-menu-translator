import SwiftUI
import UIKit

struct ContentView: View {
    @StateObject private var viewModel = MenuViewModel()
    @State private var showCameraPicker = false
    @State private var showPhotoLibraryPicker = false
    @State private var showCameraUnavailableAlert = false
    
    var body: some View {
        ZStack {
            Color(uiColor: .systemBackground)
                .ignoresSafeArea()

            if viewModel.isProcessing {
                ProcessingView()
            } else if !viewModel.menuItems.isEmpty {
                MenuListView(viewModel: viewModel)
            } else {
                CameraIntroView(
                    showCameraPicker: $showCameraPicker,
                    showPhotoLibraryPicker: $showPhotoLibraryPicker,
                    showCameraUnavailableAlert: $showCameraUnavailableAlert
                )
            }
            
            if let errorMessage = viewModel.errorMessage {
                VStack {
                    Text(errorMessage)
                        .foregroundColor(.white)
                        .padding()
                        .background(Color.red.opacity(0.8))
                        .cornerRadius(8)
                    Spacer()
                }
                .padding(.top, 50)
                .transition(.move(edge: .top))
            }
        }
        .fullScreenCover(isPresented: $showCameraPicker) {
            ImagePicker(selectedImage: $viewModel.selectedImage, isPresented: $showCameraPicker, sourceType: .camera)
        }
        .fullScreenCover(isPresented: $showPhotoLibraryPicker) {
            ImagePicker(selectedImage: $viewModel.selectedImage, isPresented: $showPhotoLibraryPicker, sourceType: .photoLibrary)
        }
        .alert(NSLocalizedString("Camera Unavailable", comment: ""), isPresented: $showCameraUnavailableAlert) {
            Button(NSLocalizedString("OK", comment: ""), role: .cancel) {}
        } message: {
            Text(NSLocalizedString("Camera not available message", comment: ""))
        }
        .onChange(of: viewModel.selectedImage) { oldValue, newImage in
            if let image = newImage {
                Task {
                    await viewModel.processImage(image)
                }
            }
        }
    }
}

struct CameraIntroView: View {
    @Binding var showCameraPicker: Bool
    @Binding var showPhotoLibraryPicker: Bool
    @Binding var showCameraUnavailableAlert: Bool
    
    var body: some View {
        VStack(spacing: 28) {
            Spacer()
            
            Text(NSLocalizedString("AI MENU", comment: ""))
                .font(.system(size: 34, weight: .bold))
                .foregroundColor(.primary)
                .accessibilityIdentifier("cameraIntroTitle")
            
            Text(NSLocalizedString("Ready to import a menu photo", comment: ""))
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Text(NSLocalizedString("Snap a photo to translate & convert", comment: ""))
                .font(.footnote)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
            
            VStack(spacing: 14) {
                Button {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    if UIImagePickerController.isSourceTypeAvailable(.camera) {
                        showCameraPicker = true
                    } else {
                        showCameraUnavailableAlert = true
                    }
                } label: {
                    Label(NSLocalizedString("Camera", comment: ""), systemImage: "camera.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                }
                .buttonStyle(.borderedProminent)
                .accessibilityIdentifier("cameraButton")
                
                Button {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    showPhotoLibraryPicker = true
                } label: {
                    Label(NSLocalizedString("Photos", comment: ""), systemImage: "photo.fill")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                }
                .buttonStyle(.bordered)
                .accessibilityIdentifier("photosButton")
            }
            .padding(.horizontal, 24)
            
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(uiColor: .systemBackground))
        .accessibilityIdentifier("cameraIntroView")
    }
}
