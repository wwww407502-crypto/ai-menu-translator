import Foundation

struct MenuParseResponse: Codable {
    let originalCurrency: String
    let targetCurrency: String
    let exchangeRate: Double
    let items: [MenuItem]
}

struct MenuItem: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    let category: String?
    let originalName: String
    let translatedName: String
    let originalPrice: Double
    let convertedPrice: Double
    
    enum CodingKeys: String, CodingKey {
        case category
        case originalName
        case translatedName
        case originalPrice
        case convertedPrice
    }
}

struct OrderItem: Identifiable, Hashable {
    let id = UUID()
    let menuItem: MenuItem
    var quantity: Int
}

struct Order: Identifiable {
    let id = UUID()
    var items: [OrderItem]
    
    var totalConvertedPrice: Double {
        items.reduce(0) { $0 + ($1.menuItem.convertedPrice * Double($1.quantity)) }
    }
    
    var totalOriginalPrice: Double {
        items.reduce(0) { $0 + ($1.menuItem.originalPrice * Double($1.quantity)) }
    }
}
