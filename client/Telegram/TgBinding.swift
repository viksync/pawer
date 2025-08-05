import Foundation

class TgBinding: ObservableObject {
    static let shared = TgBinding()

    private let webhookBaseURL = "https://99a792102789.ngrok-free.app"
    private let botUsername = "pawerapp_bot"

    let botLinkURL: URL?
    private let uniqueID: String
    @Published var isLinked: Bool = false

    private init() {
        self.uniqueID = TgBinding.getOrCreateUniqueID()
        self.botLinkURL = URL(string: "https://t.me/\(botUsername)?start=\(uniqueID)")
        self.isLinked = UserDefaults.standard.bool(forKey:
  "is_telegram_linked")
    }

    private static func getOrCreateUniqueID() -> String {
        let key = "uuid_telegram"

        if let existingID = UserDefaults.standard.string(forKey: key) {
              return existingID
        }

        let newID = UUID().uuidString
        UserDefaults.standard.set(newID, forKey: key)
        return newID
    }
}