import Foundation
import UIKit

class APIService {
    static let shared = APIService()
    private let baseURL = "http://127.0.0.1:3000/api/v1" // Use your actual IP or domain in production

    func parseMenu(image: UIImage, targetLang: String, targetCurrency: String) async throws -> MenuParseResponse {
        guard let url = URL(string: "\(baseURL)/menu/parse") else {
            throw URLError(.badURL)
        }
        
        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            throw URLError(.cannotDecodeRawData)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        var body = Data()
        
        // Add image
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"image\"; filename=\"menu.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n".data(using: .utf8)!)
        
        // Add targetLang
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"targetLang\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(targetLang)\r\n".data(using: .utf8)!)
        
        // Add targetCurrency
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"targetCurrency\"\r\n\r\n".data(using: .utf8)!)
        body.append("\(targetCurrency)\r\n".data(using: .utf8)!)
        
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        
        if !(200...299).contains(httpResponse.statusCode) {
            if let errorMsg = String(data: data, encoding: .utf8) {
                print("Server error: \(errorMsg)")
            }
            throw URLError(.badServerResponse)
        }
        
        let decoder = JSONDecoder()
        return try decoder.decode(MenuParseResponse.self, from: data)
    }
}
